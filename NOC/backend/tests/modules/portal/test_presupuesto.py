import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

def test_get_dashboard_presupuesto(client: TestClient, auth_headers):
    # This should return the default empty summary when DB is empty
    response = client.get("/portal-presupuesto/dashboard?year=2026&filter_type=TOTAL", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "resumen_mensual" in data
    assert "desglose_fuentes" in data
    assert "total_anual_ppto" in data
    assert data["total_anual_ppto"] == 0.0

@patch("modules.portal.presupuesto.router.importar_presupuesto_excel")
def test_importar_presupuesto_success(mock_importar, client: TestClient, auth_headers):
    # Mocking to avoid actual file I/O during tests
    mock_importar.return_value = None

    response = client.post("/portal-presupuesto/importar", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {"mensaje": "Presupuesto importado exitosamente desde ppto_2026.xlsx"}
    mock_importar.assert_called_once()

@patch("modules.portal.presupuesto.router.importar_presupuesto_excel")
def test_importar_presupuesto_error(mock_importar, client: TestClient, auth_headers):
    mock_importar.side_effect = Exception("File not found")

    response = client.post("/portal-presupuesto/importar", headers=auth_headers)
    assert response.status_code == 500
    assert response.json()["detail"] == "File not found"
