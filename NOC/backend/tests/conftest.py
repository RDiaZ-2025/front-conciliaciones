import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from main import app
from dependencies import get_db
import security
security.limiter.enabled = False

# Crea una base de datos SQLite en memoria para las pruebas
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    # Crea las tablas
    Base.metadata.create_all(bind=engine)
    yield engine
    # Elimina las tablas al final
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    # Inicia una transacción
    transaction = connection.begin()
    # Enlaza la sesión a esta conexión
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    # Cierra la sesión y revierte la transacción para limpiar los datos
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass # La limpieza se maneja en el fixture db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def auth_headers(client: TestClient, db_session):
    # Crear usuario admin si no existe
    from modules.auth import models
    from security import get_password_hash
    user = db_session.query(models.User).filter(models.User.email == "admin@example.com").first()
    if not user:
        user = models.User(
            username="admin",
            email="admin@example.com",
            full_name="Admin User",
            role="admin",
            permissions="ingresos,presupuesto,dashboard,mensajeria,segmentacion,analisis",
            hashed_password=get_password_hash("admin"),
            is_active=True
        )
        db_session.add(user)
        db_session.commit()

    # Login
    response = client.post("/token", data={"username": "admin@example.com", "password": "admin"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
