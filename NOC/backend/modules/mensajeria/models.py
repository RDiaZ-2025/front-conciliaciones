from sqlalchemy import Boolean, Column, Integer, String
from database import Base

class BaseNumeros(Base):
    __tablename__ = "base_numeros"

    id = Column(Integer, primary_key=True, index=True)
    Telefono = Column(String(255), nullable=True)
    Departamento = Column(String(255), nullable=True)
    Ciudad = Column(String(255), nullable=True)
    Estrato = Column(String(255), nullable=True)
    Genero = Column(String(255), nullable=True)
    Estado = Column(Boolean, nullable=True)
