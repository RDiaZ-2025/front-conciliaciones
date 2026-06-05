import os
import sys
import certifi
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime, timedelta
from googleads import ad_manager

# Ensure backend root is in PYTHONPATH so we can import 'database' and 'modules'
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))
if backend_root not in sys.path:
    sys.path.append(backend_root)

from sqlalchemy.orm import Session
from database import SessionLocal
from functions.Ingresos.crud import guardar_ingresos_admanager, guardar_ingresos_redes_excel, guardar_precio_dolar_excel

load_dotenv(os.path.join(backend_root, '.env'))

# Solucionar problemas de certificados SSL comunes con la API de Google
os.environ['SSL_CERT_FILE'] = certifi.where()

# Directorio raíz del proyecto (dos niveles arriba de este archivo: functions/ → backend/ → red+/)
_DIR_RAIZ_PROYECTO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def _resolver_ruta_excel(nombre_archivo: str) -> str:
    """
    Resuelve la ruta de un archivo Excel buscando en orden:
    1. Directorio raíz del proyecto (junto a backend/ y frontend/)
    2. Directorio actual de trabajo (compatibilidad legacy)
    3. Directorio del módulo ingresos (legado)
    4. Directorio de funciones
    """
    rutas_a_intentar = [
        os.path.join(_DIR_RAIZ_PROYECTO, nombre_archivo),          # /red+/Ingresos-Redes.xlsx
        os.path.join(os.getcwd(), nombre_archivo),                  # CWD
        os.path.join(backend_root, 'modules', 'portal', 'ingresos', nombre_archivo),
        os.path.join(os.path.dirname(__file__), nombre_archivo),    # functions/
    ]
    for ruta in rutas_a_intentar:
        if os.path.exists(ruta):
            return ruta
    raise FileNotFoundError(
        f"No se encontró el archivo '{nombre_archivo}'.\n"
        f"Rutas buscadas:\n" + "\n".join(f"  - {r}" for r in rutas_a_intentar)
    )

def obtener_cliente_gam():
    # Intenta cargar googleads.yaml de diferentes rutas relativas
    rutas_posibles = [
        os.path.join(os.path.dirname(__file__), 'googleads.yaml'),
        os.path.join(os.getcwd(), 'googleads.yaml'),
        os.path.join(backend_root, 'modules', 'portal', 'ingresos', 'googleads.yaml')
    ]
    
    for ruta in rutas_posibles:
        if os.path.exists(ruta):
            return ad_manager.AdManagerClient.LoadFromStorage(ruta)
            
    # Si no lo encuentra, asume que está en el home o donde dicten las variables de entorno
    return ad_manager.AdManagerClient.LoadFromStorage()

def ejecutar_reporte_gam(db: Session, start_date=None, end_date=None):
    client = obtener_cliente_gam()
    version_api = os.getenv("Version_api_admanger", "v202402")
    
    # Por defecto sincronizar los ultimos 30 dias (para cubrir margen de error y re-verificar)
    if not end_date:
        end_date = datetime.now().date()
    if not start_date:
        start_date = end_date - timedelta(days=30)
        
    report_job = {
        'reportQuery': {
            'dimensions': ['DATE'],
            'columns': [
                'TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS',
                'TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS',
                'AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM',
                'AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE'
            ],
            'dateRangeType': 'CUSTOM_DATE',
            'startDate': {'year': start_date.year, 'month': start_date.month, 'day': start_date.day},
            'endDate': {'year': end_date.year, 'month': end_date.month, 'day': end_date.day},
            'adUnitView': 'FLAT'
        }
    }

    try:
        print(f"Iniciando reporte en Google Ad Manager ({start_date} a {end_date})...")
        downloader = client.GetDataDownloader(version=version_api)
        report_job_id = downloader.WaitForReport(report_job)

        print(f"Reporte {report_job_id} listo. Procesando datos...")
        path_archivo = 'reporte_gam.csv.gz'
        with open(path_archivo, 'wb') as f:
            downloader.DownloadReportToFile(report_job_id, 'CSV_DUMP', f)

        df = pd.read_csv(path_archivo, compression='gzip')

        for col in df.columns:
            if 'REVENUE' in col or 'ECPM' in col:
                df[col] = pd.to_numeric(df[col], errors='coerce') / 1000000

        df = df[df['Dimension.DATE'] != 'Total']
        df['Dimension.DATE'] = pd.to_datetime(df['Dimension.DATE'], errors='coerce').dt.date
        df = df.dropna(subset=['Dimension.DATE'])

        print(f"Registros obtenidos: {len(df)}")
        
        # Replace NaNs to avoid JSON/Postgres errors
        df = df.fillna(0)
        
        datos_listos = df.to_dict(orient='records') 
        guardar_ingresos_admanager(db=db, datos_limpios=datos_listos)
        
        if os.path.exists(path_archivo):
            os.remove(path_archivo)
            
        print("Sincronización AdManager completada.")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error al ejecutar el reporte: {e}")

def importar_datos_redes_excel(db: Session, nombre_excel: str = 'Ingresos-Redes.xlsx'):
    try:
        ruta_excel = _resolver_ruta_excel(nombre_excel)
        print(f"Archivo Excel encontrado en: {ruta_excel}")
        xl = pd.ExcelFile(ruta_excel)
        
        if 'Datos' in xl.sheet_names:
            df_datos = xl.parse('Datos')
            df_datos['MES'] = pd.to_datetime(df_datos['MES'], format='%Y-%m', errors='coerce').dt.date
            df_datos = df_datos.dropna(subset=['MES', 'PLATAFORMA'])
            df_datos = df_datos.fillna(0)
            datos_listos = df_datos.to_dict(orient='records')
            guardar_ingresos_redes_excel(db, datos_listos)
            print(f"Ingresos Redes guardados con exito ({len(datos_listos)} registros).")
            
        if 'Precio' in xl.sheet_names:
            df_precios = xl.parse('Precio')
            df_precios['MES'] = pd.to_datetime(df_precios['MES'], format='%Y-%m', errors='coerce').dt.date
            df_precios = df_precios.dropna(subset=['MES'])
            df_precios = df_precios.fillna(0)
            precios_listos = df_precios.to_dict(orient='records')
            guardar_precio_dolar_excel(db, precios_listos)
            print(f"Precios Dolar guardados con exito ({len(precios_listos)} registros).")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error al importar excel de redes: {e}")
        raise e

if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("--- Sincronizando datos de Ingresos ---")
        
        # 1. Excel de YouTube y Facebook
        print("1. Procesando Excel de Redes...")
        importar_datos_redes_excel(db)
        
        # 2. AdManager
        print("\n2. Sincronizando AdManager (Histórico)...")
        # Esto reemplaza el load_historical.py antiguo
        start_date = datetime(2024, 1, 1).date()
        end_date = datetime.now().date()
        ejecutar_reporte_gam(db, start_date=start_date, end_date=end_date)
        
        print("\n--- Sincronización completada exitosamente ---")
    finally:
        db.close()