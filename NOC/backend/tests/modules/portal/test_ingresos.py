import pytest
from fastapi.testclient import TestClient
from datetime import date
from modules.portal.ingresos.models import IngresoPortal, IngresoRedes

def test_get_ingresos_grafico_empty(client: TestClient, auth_headers):
    response = client.get("/ingresos/datos-grafico", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data == {"fechas": [], "datasets": {}}

def test_get_ingresos_grafico_with_data(client: TestClient, auth_headers, db_session):
    # Add dummy data
    ingreso = IngresoPortal(
        Fecha=date.today(),
        IngresosAdExchange=100.5,
        PromedioAdExchange=2.5,
        ImpresionesTotales=1000,
        ImpresionesSinRellenar=50
    )
    db_session.add(ingreso)
    db_session.commit()

    response = client.get("/ingresos/datos-grafico", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["fechas"]) == 1
    assert data["fechas"][0] == str(date.today())
    assert data["datasets"]["revenue"][0] == 100.5
    assert data["datasets"]["ecpm"][0] == 2.5
    assert data["datasets"]["impresiones"][0] == 1000
    assert data["datasets"]["impresiones_sin_rellenar"][0] == 50

def test_get_ingresos_redes_empty(client: TestClient, auth_headers):
    response = client.get("/ingresos/datos-redes/youtube", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data == {"fechas": [], "datasets": {}}

def test_get_ingresos_redes_with_data(client: TestClient, auth_headers, db_session):
    ingreso = IngresoRedes(
        Plataforma="youtube",
        Mes=date.today(),
        TotalBruto=500.0,
        Retencion=50.0,
        TotalNeto=450.0,
        RedMasTv=200.0,
        RedMasNoticias=100.0,
        QuinceMinutos=100.0,
        RadiolaTv=50.0
    )
    db_session.add(ingreso)
    db_session.commit()

    response = client.get("/ingresos/datos-redes/youtube", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["fechas"]) == 1
    assert data["datasets"]["total_bruto"][0] == 500.0
    assert data["datasets"]["total_neto"][0] == 450.0
    assert data["datasets"]["canales"]["red_mas_tv"][0] == 200.0

def test_get_resumen_general(client: TestClient, auth_headers, db_session):
    # This might fail or return zeroes depending on how crud.py is implemented, let's test it
    response = client.get("/ingresos/resumen-general", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "admanager_total" in data
    assert "facebook_total" in data
    assert "youtube_total_neto" in data
    assert "total_global_usd" in data
