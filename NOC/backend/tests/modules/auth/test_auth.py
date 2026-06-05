import pytest
from fastapi.testclient import TestClient

def test_create_user(client: TestClient, auth_headers):
    # Test valid user creation
    user_data = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword",
        "full_name": "Test User",
        "role": "admin",
        "modules": ["ingresos", "presupuesto"]
    }
    response = client.post("/users", json=user_data, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"
    assert "id" in data

    # Test duplicate email
    response_duplicate = client.post("/users", json=user_data, headers=auth_headers)
    assert response_duplicate.status_code == 400
    assert response_duplicate.json()["detail"] == "El correo ya está registrado"

def test_login_for_access_token(client: TestClient, auth_headers):
    # First, create a user
    user_data = {
        "username": "loginuser",
        "email": "login@example.com",
        "password": "loginpassword",
        "full_name": "Login User",
        "role": "admin",
        "modules": []
    }
    client.post("/users", json=user_data, headers=auth_headers)

    # Test valid login
    login_data = {
        "username": "login@example.com",
        "password": "loginpassword"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"

    # Test invalid login
    invalid_login_data = {
        "username": "login@example.com",
        "password": "wrongpassword"
    }
    response_invalid = client.post("/token", data=invalid_login_data)
    assert response_invalid.status_code == 401
    assert response_invalid.json()["detail"] == "Usuario o contraseña incorrectos"

def test_read_users(client: TestClient, auth_headers):
    # Ensure there's at least one user
    user_data = {
        "username": "readuser",
        "email": "read@example.com",
        "password": "readpassword",
        "full_name": "Read User",
        "role": "admin",
        "modules": []
    }
    client.post("/users", json=user_data, headers=auth_headers)

    response = client.get("/users", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    assert len(response.json()) >= 1

def test_update_user(client: TestClient, auth_headers):
    # Create user to update
    user_data = {
        "username": "updateuser",
        "email": "update@example.com",
        "password": "updatepassword",
        "full_name": "Update User",
        "role": "user",
        "modules": []
    }
    create_response = client.post("/users", json=user_data, headers=auth_headers)
    user_id = create_response.json()["id"]

    # Update the user
    update_data = {
        "full_name": "Updated Name",
        "role": "admin",
        "modules": ["ventas"]
    }
    update_response = client.put(f"/users/{user_id}", json=update_data, headers=auth_headers)
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Updated Name"
    assert update_response.json()["role"] == "admin"
    assert update_response.json()["permissions"] == "ventas"

    # Test updating non-existent user
    response_not_found = client.put("/users/9999", json=update_data, headers=auth_headers)
    assert response_not_found.status_code == 404

def test_delete_user(client: TestClient, auth_headers):
    # Create user to delete
    user_data = {
        "username": "deleteuser",
        "email": "delete@example.com",
        "password": "deletepassword",
        "full_name": "Delete User",
        "role": "user",
        "modules": []
    }
    create_response = client.post("/users", json=user_data, headers=auth_headers)
    user_id = create_response.json()["id"]

    # Delete the user
    delete_response = client.delete(f"/users/{user_id}", headers=auth_headers)
    assert delete_response.status_code == 200
    assert delete_response.json() == {"message": "Usuario eliminado exitosamente"}

    # Verify user is deleted by trying to delete again
    delete_again_response = client.delete(f"/users/{user_id}", headers=auth_headers)
    assert delete_again_response.status_code == 404
