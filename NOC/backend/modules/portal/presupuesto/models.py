from sqlalchemy import Date, Column, Integer, Float, String
from database import Base

class Presupuesto(Base):
    __tablename__ = "presupuesto"

    id = Column(Integer, primary_key=True, index=True)
    Fecha = Column(Date, nullable=False, index=True) # Almacenaremos el primer dia del mes (ej: 2026-01-01)
    Seccion = Column(String(100), nullable=True, index=True)
    Fuente = Column(String(100), nullable=True, index=True)
    Ppto = Column(Float, nullable=True, default=0.0)
    Ejecucion = Column(Float, nullable=True, default=0.0)
