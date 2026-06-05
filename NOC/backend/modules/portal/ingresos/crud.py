from sqlalchemy.orm import Session
from sqlalchemy import func
from modules.portal.ingresos.models import IngresoPortal, IngresoRedes, PrecioDolar
from datetime import datetime, date

def obtener_ingresos_admanager(db: Session, limite: int = 30):
    """
    Obtiene los registros de ingresos ordenados por fecha ascendente para gráficas.
    """
    try:
        resultados = db.query(IngresoPortal)\
            .order_by(IngresoPortal.Fecha.desc())\
            .limit(limite)\
            .all()
        
        # Invertir para que queden ascendentes cronológicamente (de izquierda a derecha en la gráfica)
        return list(reversed(resultados))
    except Exception as e:
        print(f"Error al obtener ingresos de BD: {e}")
        return []

def obtener_ingresos_redes(db: Session, plataforma: str, limite: int = 12):
    try:
        resultados = db.query(IngresoRedes)\
            .filter(func.upper(IngresoRedes.Plataforma) == plataforma.upper())\
            .order_by(IngresoRedes.Mes.desc())\
            .limit(limite)\
            .all()
        return list(reversed(resultados))
    except Exception as e:
        print(f"Error al obtener redes: {e}")
        return []

import math

def safe_float(val):
    if val is None or math.isnan(val):
        return 0.0
    return float(val)

def obtener_resumen_general(db: Session):
    # Sumar ingresos totales de admanager (todo el histórico o último mes, etc.)
    # Para el chat, daremos totales de todo el registro
    total_admanager = safe_float(db.query(func.sum(IngresoPortal.IngresosAdExchange)).scalar())
    
    # Sumar redes
    total_youtube = safe_float(db.query(func.sum(IngresoRedes.TotalNeto)).filter(func.upper(IngresoRedes.Plataforma) == 'YOUTUBE').scalar())
    total_fb = safe_float(db.query(func.sum(IngresoRedes.TotalNeto)).filter(func.upper(IngresoRedes.Plataforma) == 'FACEBOOK').scalar())
    
    return {
        "admanager_total": total_admanager,
        "youtube_total_neto": total_youtube,
        "facebook_total": total_fb,
        "total_global_usd": total_admanager + total_youtube + total_fb
    }
