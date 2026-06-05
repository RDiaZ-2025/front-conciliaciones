import os
import pandas as pd
from sqlalchemy.orm import Session
from modules.portal.presupuesto.crud import guardar_presupuesto_excel

_DIR_RAIZ_PROYECTO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

def _resolver_ruta_excel(nombre_archivo: str) -> str:
    rutas_a_intentar = [
        os.path.join(_DIR_RAIZ_PROYECTO, nombre_archivo),          
        os.path.join(os.getcwd(), nombre_archivo),                  
        os.path.join(os.path.dirname(__file__), nombre_archivo),    
    ]
    for ruta in rutas_a_intentar:
        if os.path.exists(ruta):
            return ruta
    raise FileNotFoundError(
        f"No se encontró el archivo '{nombre_archivo}'.\n"
        f"Rutas buscadas:\n" + "\n".join(f"  - {r}" for r in rutas_a_intentar)
    )

def importar_presupuesto_excel(db: Session, nombre_excel: str = 'ppto_2026.xlsx'):
    try:
        ruta_excel = _resolver_ruta_excel(nombre_excel)
        print(f"Archivo Excel de presupuesto encontrado en: {ruta_excel}")
        
        # Leemos el archivo saltando la primera fila que asumo es header en algunos excels
        # Depende de como venga. Si viene como en pd.read_excel('ppto_2026.xlsx', skiprows=1)
        # Vamos a intentar leerlo y validar si tiene la columna "Fecha".
        
        # Primero leemos sin saltar
        df = pd.read_excel(ruta_excel)
        
        # Si la columna "Fecha" no esta en los headers, probablemente este en la segunda fila (skiprows=1)
        if 'Fecha' not in df.columns:
            df = pd.read_excel(ruta_excel, skiprows=1)
            
        if 'Fecha' not in df.columns:
            raise ValueError("El archivo Excel no tiene un formato válido o falta la columna 'Fecha'.")

        # Limpieza
        df['Fecha'] = pd.to_datetime(df['Fecha'], errors='coerce').dt.date
        df = df.dropna(subset=['Fecha']) # Elimina filas que no tienen fecha (basura / subtotales al final)
        
        # Rellenar NaN con 0 para calculos matematicos limpios
        if 'ppto' in df.columns:
            df['ppto'] = df['ppto'].fillna(0.0)
        if 'Ejecución' in df.columns:
            df['Ejecución'] = df['Ejecución'].fillna(0.0)
            
        datos_listos = df.to_dict(orient='records')
        
        guardar_presupuesto_excel(db, datos_listos)
        print(f"Presupuesto guardado con éxito ({len(datos_listos)} registros).")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error al importar excel de presupuesto: {e}")
        raise e
