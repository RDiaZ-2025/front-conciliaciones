import pytest
from fastapi.testclient import TestClient

def test_get_overview_stats(client: TestClient, auth_headers):
    response = client.get("/dashboard/overview", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "cards" in data
    assert "volume" in data
    assert "trend" in data
    assert "highlights" in data

def test_get_content_stats(client: TestClient, auth_headers):
    response = client.get("/dashboard/content", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "matrix" in data
    assert "authors" in data

def test_get_entities_stats(client: TestClient, auth_headers):
    response = client.get("/dashboard/entities", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "section_avg" in data
    assert "entities" in data
    assert "best_combinations" in data

def test_get_entity_detail_not_found(client: TestClient, auth_headers):
    # Tests a specific entity that does not exist
    response = client.get("/dashboard/entities/detail?entity=Desconocido", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Entity not found"

def test_get_reach_stats(client: TestClient, auth_headers):
    response = client.get("/dashboard/reach", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "users_by_section" in data
    assert "views_by_topic" in data
    assert "depth_by_section" in data

def test_get_audience_stats(client: TestClient, auth_headers):
    response = client.get("/dashboard/audience", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "global_fidelity" in data
    assert "sections" in data

def test_get_dashboard_filters(client: TestClient, auth_headers):
    response = client.get("/dashboard/filters", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "authors" in data
    assert "topics" in data
    assert "categories" in data
    assert "sections" in data
    assert "sources" in data
