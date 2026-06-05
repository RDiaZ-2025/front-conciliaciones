"""
router.py — Endpoint FastAPI para el Agente IA Red+
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from modules.portal.agent.agent import chat

router = APIRouter(prefix="/api/agent", tags=["Agente IA"])


class HistoryMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryMessage]] = []


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(request: ChatRequest):
    """
    Endpoint del Agente IA Financiero Red+.
    Recibe un mensaje del usuario y el historial de la conversación,
    consulta la base de datos via tools y devuelve una respuesta en lenguaje natural.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    try:
        history = [
            {"role": msg.role, "content": msg.content}
            for msg in (request.history or [])
        ]
        response = await chat(message=request.message, history=history)
        return ChatResponse(response=response)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en el agente: {str(e)}"
        )


@router.get("/health", tags=["Agente IA"])
def agent_health():
    """Verifica que el módulo del agente está cargado correctamente."""
    return {"status": "ok", "agent": "Red+ Financial Agent v1.0"}
