from sqlalchemy.orm import Session
from sqlalchemy import func
from modules.portal.ingresos.models import IngresoPortal, IngresoRedes, PrecioDolar
from datetime import datetime, date

def guardar_ingresos_admanager(db: Session, datos_limpios: list[dict]):
    if not datos_limpios:
        print("No hay datos para guardar.")
        return

    # Extraer las fechas del reporte validando que existan
    fechas_del_reporte = [fila['Dimension.DATE'] for fila in datos_limpios if 'Dimension.DATE' in fila]
    
    if not fechas_del_reporte:
        print("No se encontraron columnas de fecha en los datos.")
        return

    # 1. Eliminar datos existentes para estas fechas (evitar duplicados)
    db.query(IngresoPortal).filter(IngresoPortal.Fecha.in_(fechas_del_reporte)).delete(synchronize_session=False)
    
    # 2. Insertar los nuevos datos masivamente
    nuevos_registros = []
    
    for fila in datos_limpios:
        # Asegurarnos de tener los nombres correctos que coinciden con pandas
        nuevo_ingreso = IngresoPortal(
            Fecha=fila.get('Dimension.DATE'),
            ImpresionesTotales=fila.get('Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS', 0),
            ImpresionesSinRellenar=fila.get('Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS', 0),
            PromedioAdExchange=fila.get('Column.AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM', 0.0),
            IngresosAdExchange=fila.get('Column.AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE', 0.0)
        )
        nuevos_registros.append(nuevo_ingreso)

    try:
        # Guardado en un solo lote para máxima eficiencia
        db.bulk_save_objects(nuevos_registros)
        db.commit()
        print(f"Éxito: {len(nuevos_registros)} registros sincronizados (Sin duplicados).")
    except Exception as e:
        db.rollback()
        print(f"Error al guardar en BD: {e}")

def guardar_precio_dolar_excel(db: Session, datos_precios: list[dict]):
    if not datos_precios:
        return
        
    for item in datos_precios:
        mes = item.get('MES')
        precio = item.get('Precio', 0.0)
        
        # Eliminar si existe para reemplazar (idempotente)
        db.query(PrecioDolar).filter(PrecioDolar.Mes == mes).delete(synchronize_session=False)
        db.add(PrecioDolar(Mes=mes, Precio=precio))
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error al guardar precio dolar: {e}")

def guardar_ingresos_redes_excel(db: Session, datos_redes: list[dict]):
    if not datos_redes:
        return
        
    # Obtener qué meses/plataformas vienen para eliminarlos previamente
    for item in datos_redes:
        mes = item.get('MES')
        plataforma = item.get('PLATAFORMA')
        if mes and plataforma:
            db.query(IngresoRedes).filter(
                IngresoRedes.Mes == mes, 
                IngresoRedes.Plataforma == plataforma
            ).delete(synchronize_session=False)
            
    nuevos_registros = []
    for fila in datos_redes:
        fecha_obj = fila.get('MES')
        red_tv = float(fila.get('RED+ TV', 0.0))
        red_noticias = float(fila.get('RED+NOTICIAS', 0.0))
        quince_minutos = float(fila.get('15 MINUTOS', 0.0))
        radiola_tv = float(fila.get('RADIOLATV', 0.0))
        
        if fila.get('PLATAFORMA') == 'FACEBOOK':
            total_neto = red_tv + red_noticias + quince_minutos + radiola_tv
            total_bruto = total_neto
            retencion = 0.0
        else:
            total_neto = float(fila.get('TOTAL NETO', 0.0))
            total_bruto = float(fila.get('TOTAL BRUTO', 0.0))
            retencion = float(fila.get('RETENCION', 0.0))

        nuevo = IngresoRedes(
            Mes=fecha_obj,
            Plataforma=fila.get('PLATAFORMA'),
            TotalBruto=total_bruto,
            Retencion=retencion,
            TotalNeto=total_neto,
            RedMasTv=red_tv,
            RedMasNoticias=red_noticias,
            QuinceMinutos=quince_minutos,
            RadiolaTv=radiola_tv
        )
        nuevos_registros.append(nuevo)
        
    try:
        db.bulk_save_objects(nuevos_registros)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error al guardar ingresos redes: {e}")
