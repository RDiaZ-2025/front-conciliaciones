from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import logging

from dotenv import load_dotenv
import os
load_dotenv()

logger = logging.getLogger(__name__)

SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL")

is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

# Local (SQLite)
if is_sqlite:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
    logger.info("Base de datos: SQLite (modo local/desarrollo)")

# Producción (SQL Server)
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False,
    )
    logger.info("Base de datos: Azure SQL Server con pymssql (modo producción)")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()