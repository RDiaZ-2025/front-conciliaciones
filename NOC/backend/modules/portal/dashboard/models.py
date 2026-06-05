from sqlalchemy import Boolean, Column, Integer, String, Date, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class DashboardData(Base):
    __tablename__ = "dashboard_data"

    id = Column(Integer, primary_key=True, index=True)
    rank_seccion = Column(Integer, nullable=True)
    mes = Column(String(255), nullable=True, index=True)
    seccion = Column(String(255), nullable=True, index=True)
    fecha_url = Column(Date, nullable=True, index=True)
    clean_url = Column(String(255), nullable=True)
    titulo_url = Column(String(255), nullable=True)
    autor = Column(String(255), nullable=True, index=True)
    total_users = Column(Integer, nullable=True)
    screen_page_views = Column(Integer, nullable=True)
    sessions = Column(Integer, nullable=True)
    engaged_sessions = Column(Integer, nullable=True)
    tema_principal = Column(String(255), nullable=True, index=True)
    categoria_entidad = Column(String(255), nullable=True, index=True)

    fuente = Column(String(255), nullable=True, default="Discover", index=True)
    entidad_principal = Column(String(255), nullable=True)
    semantic_score = Column(Float, nullable=True)
    syntactic_score = Column(Float, nullable=True)

    analisis_gemini_raw = Column(Text, nullable=True)

    entities = relationship("Entity", back_populates="article", cascade="all, delete-orphan")

class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True, index=True)
    dashboard_data_id = Column(Integer, ForeignKey("dashboard_data.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(255), nullable=True, default="Tema")
    is_principal = Column(Boolean, default=False, nullable=False)
    semantic_score = Column(Float, nullable=True)
    syntactic_score = Column(Float, nullable=True)

    article = relationship("DashboardData", back_populates="entities")
