from sqlalchemy import Date, Column, Integer, Float, String
from database import Base

class IngresoPortal(Base):
    __tablename__ = "ingreso_portal"

    id = Column(Integer, primary_key=True, index=True)
    Fecha = Column(Date, nullable=True)
    ImpresionesTotales = Column(Integer, nullable=True)
    ImpresionesSinRellenar = Column(Integer, nullable=True)
    PromedioAdExchange = Column(Float, nullable=True)
    IngresosAdExchange = Column(Float, nullable=True)
    USD = Column(Float, nullable=True)
    COP = Column(Integer, nullable=True)

class IngresoRedes(Base):
    __tablename__ = "ingreso_redes"

    id = Column(Integer, primary_key=True, index=True)
    Mes = Column(Date, nullable=False, index=True) # Almacenaremos el primer dia del mes (ej: 2024-01-01)
    Plataforma = Column(String(50), nullable=False, index=True) # YOUTUBE, FACEBOOK
    TotalBruto = Column(Float, nullable=True)
    Retencion = Column(Float, nullable=True)
    TotalNeto = Column(Float, nullable=True)
    RedMasTv = Column(Float, nullable=True)
    RedMasNoticias = Column(Float, nullable=True)
    QuinceMinutos = Column(Float, nullable=True)
    RadiolaTv = Column(Float, nullable=True)

class PrecioDolar(Base):
    __tablename__ = "precio_dolar"

    id = Column(Integer, primary_key=True, index=True)
    Mes = Column(Date, nullable=False, index=True, unique=True)
    Precio = Column(Float, nullable=False)