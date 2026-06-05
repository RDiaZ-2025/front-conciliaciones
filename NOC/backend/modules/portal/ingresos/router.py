from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from modules.portal.ingresos import models
from modules.portal.ingresos.crud import obtener_ingresos_admanager, obtener_ingresos_redes, obtener_resumen_general

# Usaremos dependencias globalmente para inyectar db, asumiendo import de `dependencies.py`
import dependencies

router = APIRouter(
    prefix="/ingresos",
    tags=["Portal Ingresos"]
)

from datetime import datetime, date
from typing import Optional

@router.get("/datos-grafico")
def get_ingresos_grafico(limite: int = 2000, db: Session = Depends(dependencies.get_db), user = Depends(dependencies.check_permission("ingresos"))):
    """
    Ruta para obtener los datos mapeados para la gráfica de formato trading.
    """
    ingresos = obtener_ingresos_admanager(db=db, limite=limite)
    # Por si no hay datos, retornamos vacio en lugar de error
    if not ingresos:
        return {"fechas": [], "datasets": {}}
        
    fechas = [str(i.Fecha) for i in ingresos]
    revenue = [i.IngresosAdExchange for i in ingresos]
    ecpm = [i.PromedioAdExchange for i in ingresos]
    impresiones = [i.ImpresionesTotales for i in ingresos]
    impresiones_sin_rellenar = [i.ImpresionesSinRellenar for i in ingresos]
    
    return {
        "fechas": fechas,
        "datasets": {
            "revenue": revenue,
            "ecpm": ecpm,
            "impresiones": impresiones,
            "impresiones_sin_rellenar": impresiones_sin_rellenar
        }
    }

@router.get("/datos-redes/{plataforma}")
def get_ingresos_redes(
    plataforma: str,
    limite: int = 200,
    db: Session = Depends(dependencies.get_db), 
    user = Depends(dependencies.check_permission("ingresos"))
):
    ingresos = obtener_ingresos_redes(db=db, plataforma=plataforma, limite=limite)
    if not ingresos:
        return {"fechas": [], "datasets": {}}
        
    fechas = [str(i.Mes) for i in ingresos]
    total_bruto = [i.TotalBruto for i in ingresos]
    retencion = [i.Retencion for i in ingresos]
    total_neto = [i.TotalNeto for i in ingresos]
    red_mas_tv = [i.RedMasTv for i in ingresos]
    red_mas_noticias = [i.RedMasNoticias for i in ingresos]
    quince_minutos = [i.QuinceMinutos for i in ingresos]
    radiola_tv = [i.RadiolaTv for i in ingresos]
    
    return {
        "fechas": fechas,
        "datasets": {
            "total_bruto": total_bruto,
            "retencion": retencion,
            "total_neto": total_neto,
            "canales": {
                "red_mas_tv": red_mas_tv,
                "red_mas_noticias": red_mas_noticias,
                "quince_minutos": quince_minutos,
                "radiola_tv": radiola_tv
            }
        }
    }

@router.get("/resumen-general")
def get_resumen_general(db: Session = Depends(dependencies.get_db), user = Depends(dependencies.check_permission("ingresos"))):
    return obtener_resumen_general(db)
