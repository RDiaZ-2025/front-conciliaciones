from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import List, Dict
from modules.portal.presupuesto.models import Presupuesto

def guardar_presupuesto_excel(db: Session, datos_limpios: List[Dict]):
    """
    Recibe una lista de diccionarios, limpia la tabla y la reescribe.
    Esto permite que el Excel siga siendo la fuente de verdad y se puedan hacer correcciones
    subiendo el Excel nuevamente.
    """
    # Borrar datos existentes
    db.query(Presupuesto).delete()
    
    nuevos_registros = []
    for row in datos_limpios:
        nuevo = Presupuesto(
            Fecha=row['Fecha'],
            Seccion=row.get('Seccion', ''),
            Fuente=row.get('Fuente', ''),
            Ppto=row.get('ppto', 0.0) if row.get('ppto') is not None else 0.0,
            Ejecucion=row.get('Ejecución', 0.0) if row.get('Ejecución') is not None else 0.0
        )
        nuevos_registros.append(nuevo)
        
    db.add_all(nuevos_registros)
    db.commit()

def calcular_porcentaje(ppto: float, ejecucion: float) -> float:
    if ppto == 0 and ejecucion > 0:
        return 100.0 # superavit total
    if ppto == 0 and ejecucion == 0:
        return 0.0
    return round((ejecucion / ppto) * 100, 2)

def obtener_resumen_dashboard(db: Session, year: int = 2026, filter_type: str = "TOTAL"):
    """
    Calcula el resumen mensual, por fuente y el total anual.
    """
    max_month = db.query(func.max(extract('month', Presupuesto.Fecha))).filter(
        Presupuesto.Ejecucion > 0, 
        extract('year', Presupuesto.Fecha) == year
    ).scalar()
    
    if not max_month:
        max_month = 12
    max_month = int(max_month)

    start_month = 1
    end_month = 12

    if filter_type == "LAST_MONTH":
        start_month = max_month
        end_month = max_month
    elif filter_type == "LAST_3_MONTHS":
        start_month = max(1, max_month - 2)
        end_month = max_month
    elif filter_type == "YTD":
        start_month = 1
        end_month = max_month

    base_filter = [
        extract('year', Presupuesto.Fecha) == year,
        extract('month', Presupuesto.Fecha) >= start_month,
        extract('month', Presupuesto.Fecha) <= end_month
    ]

    # 1. Resumen Mensual
    mensual_query = db.query(
        Presupuesto.Fecha,
        func.sum(Presupuesto.Ppto).label('total_ppto'),
        func.sum(Presupuesto.Ejecucion).label('total_ejecucion')
    ).filter(*base_filter).group_by(Presupuesto.Fecha).order_by(Presupuesto.Fecha).all()

    resumen_mensual = []
    total_anual_ppto = 0.0
    total_anual_ejecucion = 0.0

    for r in mensual_query:
        ppto = float(r.total_ppto or 0)
        ejec = float(r.total_ejecucion or 0)
        total_anual_ppto += ppto
        total_anual_ejecucion += ejec
        
        resumen_mensual.append({
            "mes": r.Fecha,
            "total_ppto": ppto,
            "total_ejecucion": ejec,
            "diferencia": ppto - ejec,
            "porcentaje_cumplimiento": calcular_porcentaje(ppto, ejec)
        })

    # 2. Desglose por Fuentes (Anual)
    fuentes_query = db.query(
        Presupuesto.Seccion,
        Presupuesto.Fuente,
        func.sum(Presupuesto.Ppto).label('total_ppto'),
        func.sum(Presupuesto.Ejecucion).label('total_ejecucion')
    ).filter(*base_filter).group_by(Presupuesto.Seccion, Presupuesto.Fuente).all()

    desglose_fuentes = []
    for f in fuentes_query:
        ppto = float(f.total_ppto or 0)
        ejec = float(f.total_ejecucion or 0)
        # Solo agregar si hay presupuesto o ejecución asignada (ignorar basura si la hay)
        if ppto > 0 or ejec > 0:
            desglose_fuentes.append({
                "seccion": f.Seccion or "Desconocido",
                "fuente": f.Fuente or "Desconocido",
                "total_ppto": ppto,
                "total_ejecucion": ejec,
                "diferencia": ppto - ejec,
                "porcentaje_cumplimiento": calcular_porcentaje(ppto, ejec)
            })

    diferencia_anual = total_anual_ppto - total_anual_ejecucion
    porcentaje_anual = calcular_porcentaje(total_anual_ppto, total_anual_ejecucion)

    # Ordenar desglose para que los de menor cumplimiento aparezcan primero (opcional, util para analisis)
    desglose_fuentes.sort(key=lambda x: x['porcentaje_cumplimiento'])

    return {
        "resumen_mensual": resumen_mensual,
        "desglose_fuentes": desglose_fuentes,
        "total_anual_ppto": total_anual_ppto,
        "total_anual_ejecucion": total_anual_ejecucion,
        "diferencia_anual": diferencia_anual,
        "porcentaje_anual": porcentaje_anual
    }
