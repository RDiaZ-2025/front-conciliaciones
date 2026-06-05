from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
import shutil
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

# Database y Dependencies
import database, dependencies

# Import modular routers
from modules.auth import router as auth_router
from modules.portal.dashboard import router as dashboard_router
from modules.mensajeria import router as mensajeria_router
from modules.portal.ingresos import router as ingresos_router
from modules.portal.presupuesto import router as presupuesto_router
from modules.portal.agent import router as agent_router

# Import models to ensure they are registered with SQLAlchemy's metadata
from modules.auth import models as auth_models
from modules.portal.dashboard import models as dashboard_models
from modules.mensajeria import models as mensajeria_models
from modules.portal.ingresos import models as ingresos_models
from modules.portal.presupuesto import models as presupuesto_models

import os
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Red+ — Sistema de gestion",
    description="Sistema de gestion RED+",
    version="1.0.0",
)

# Rate Limiting (Protección Anti-DDoS y Brute Force)
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler
import security

app.state.limiter = security.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Cabeceras de Seguridad (Protección XSS, Clickjacking, MIME-Sniffing)
from fastapi import Request
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Routers de módulos
app.include_router(auth_router.router)
app.include_router(dashboard_router.router)
app.include_router(mensajeria_router.router)
app.include_router(ingresos_router.router)
app.include_router(presupuesto_router.router)
app.include_router(agent_router.router)

# CORS
# En desarrollo: "http://localhost:4200"
# En Azure: añadir la URL de Static Web Apps en la variable ALLOWED_ORIGINS del .env Ejemplo: "http://localhost:4200,https://redmas.azurestaticapps.net"
_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200")
origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ── Endpoints base ────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def read_root():
    return {"status": "ok", "mensaje": "El backend está funcionando"}

@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint de health check para Azure App Service y load balancers."""
    return {"status": "healthy"}

# Trigger reload