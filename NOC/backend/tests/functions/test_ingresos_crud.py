import pytest
from sqlalchemy.orm import Session
from datetime import date
from functions.Ingresos.crud import (
    guardar_ingresos_admanager,
    guardar_precio_dolar_excel,
    guardar_ingresos_redes_excel
)
from modules.portal.ingresos.models import IngresoPortal, IngresoRedes, PrecioDolar

def test_guardar_ingresos_admanager(db_session: Session):
    datos = [
        {
            'Dimension.DATE': date(2024, 1, 1),
            'Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS': 1000,
            'Column.TOTAL_INVENTORY_LEVEL_UNFILLED_IMPRESSIONS': 100,
            'Column.AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM': 1.5,
            'Column.AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE': 1.5
        }
    ]
    
    guardar_ingresos_admanager(db_session, datos)
    
    # Verify
    reg = db_session.query(IngresoPortal).filter(IngresoPortal.Fecha == date(2024, 1, 1)).first()
    assert reg is not None
    assert reg.ImpresionesTotales == 1000
    assert reg.IngresosAdExchange == 1.5

def test_guardar_ingresos_admanager_duplicates(db_session: Session):
    # Initial data
    db_session.add(IngresoPortal(Fecha=date(2024, 1, 1), ImpresionesTotales=500))
    db_session.commit()
    
    datos = [
        {
            'Dimension.DATE': date(2024, 1, 1),
            'Column.TOTAL_LINE_ITEM_LEVEL_IMPRESSIONS': 2000,
        }
    ]
    
    guardar_ingresos_admanager(db_session, datos)
    
    # Should replace old data
    regs = db_session.query(IngresoPortal).filter(IngresoPortal.Fecha == date(2024, 1, 1)).all()
    assert len(regs) == 1
    assert regs[0].ImpresionesTotales == 2000

def test_guardar_precio_dolar_excel(db_session: Session):
    datos = [
        {'MES': date(2024, 1, 1), 'Precio': 4000.0}
    ]
    
    guardar_precio_dolar_excel(db_session, datos)
    
    reg = db_session.query(PrecioDolar).filter(PrecioDolar.Mes == date(2024, 1, 1)).first()
    assert reg is not None
    assert reg.Precio == 4000.0

def test_guardar_ingresos_redes_excel(db_session: Session):
    datos = [
        {
            'MES': date(2024, 1, 1),
            'PLATAFORMA': 'YOUTUBE',
            'RED+ TV': 100.0,
            'RED+NOTICIAS': 50.0,
            '15 MINUTOS': 30.0,
            'RADIOLATV': 20.0,
            'TOTAL NETO': 200.0,
            'TOTAL BRUTO': 250.0,
            'RETENCION': 50.0
        },
        {
            'MES': date(2024, 1, 1),
            'PLATAFORMA': 'FACEBOOK',
            'RED+ TV': 10.0,
            'RED+NOTICIAS': 10.0,
            '15 MINUTOS': 10.0,
            'RADIOLATV': 10.0
        }
    ]
    
    guardar_ingresos_redes_excel(db_session, datos)
    
    yt = db_session.query(IngresoRedes).filter(IngresoRedes.Plataforma == 'YOUTUBE').first()
    assert yt is not None
    assert yt.TotalNeto == 200.0
    assert yt.RedMasTv == 100.0
    
    fb = db_session.query(IngresoRedes).filter(IngresoRedes.Plataforma == 'FACEBOOK').first()
    assert fb is not None
    assert fb.TotalNeto == 40.0 # 10+10+10+10
    assert fb.TotalBruto == 40.0
