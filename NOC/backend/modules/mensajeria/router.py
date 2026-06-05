from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import dependencies
from modules.mensajeria import models

router = APIRouter(
    prefix="/mensajeria",
    tags=["mensajeria"],
    responses={404: {"description": "Not found"}},
)

@router.get("/")
async def read_mensajeria_root(user = Depends(dependencies.check_permission("mensajeria"))):
    return {"message": "Modulo de Mensajeria Activo", "user": user.email}

@router.get("/segmentacion")
async def read_segmentacion(user = Depends(dependencies.check_permission("segmentacion"))):
    return [{"id": 1, "name": "Base Clientes VIP", "count": 1500}, {"id": 2, "name": "Base Morosos", "count": 300}]

@router.get("/analisis")
async def read_analisis_sms(user = Depends(dependencies.check_permission("analisis"))):
    return {"sent": 1000, "delivered": 950, "failed": 50}
