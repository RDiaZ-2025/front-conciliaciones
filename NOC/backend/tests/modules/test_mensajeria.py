import pytest
from fastapi.testclient import TestClient

def test_read_mensajeria_root(client: TestClient, auth_headers):
    response = client.get("/mensajeria/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Modulo de Mensajeria Activo"
    assert data["user"] == "admin@example.com"

def test_read_segmentacion(client: TestClient, auth_headers):
    response = client.get("/mensajeria/segmentacion", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["name"] == "Base Clientes VIP"

def test_read_analisis_sms(client: TestClient, auth_headers):
    response = client.get("/mensajeria/analisis", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["sent"] == 1000
    assert data["delivered"] == 950
    assert data["failed"] == 50
