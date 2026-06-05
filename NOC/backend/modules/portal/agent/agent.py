"""
agent.py — Agente IA Red+ construido con LangGraph
Ciclo: mensaje → razonamiento (GPT-4o-mini) → tool → razonamiento → respuesta
"""
import os
import json
from typing import Annotated, Sequence, TypedDict

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
#from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from modules.portal.agent.tools import (
    get_admanager_data,
    get_youtube_data,
    get_facebook_data,
    get_presupuesto_data,
    get_daily_summary,
)

# ── Sistema de Prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Eres el Asistente Financiero de RED+, un grupo de medios colombiano.
Tienes acceso a herramientas para consultar datos en tiempo real de la base de datos.

Herramientas disponibles:
- get_admanager: Ingresos diarios de publicidad web (Ad Manager)
- get_youtube: Ingresos mensuales de YouTube (canales: RED+ TV, Noticias, 15 Minutos, RadiolaTV)
- get_facebook: Ingresos mensuales de Facebook
- get_presupuesto: Presupuesto vs ejecución real por sección
- get_resumen_diario: Resumen completo de todas las fuentes

Instrucciones:
- Responde SIEMPRE en español
- Usa los datos reales de las herramientas, nunca inventes cifras
- Cuando muestres valores monetarios, usa formato USD con símbolo $ y separadores de miles
- Cuando calcules variaciones, indica claramente si sube 📈 o baja 📉
- Si no hay datos disponibles para un período, dilo claramente y sugiere consultar otro período
- Sé conciso pero completo. Usa emojis sutiles para mejorar la legibilidad
- Para preguntas de presupuesto, siempre menciona el % de ejecución
- Si la pregunta es ambigua, usa get_resumen_diario como punto de partida
"""


# ── Definir Tools como LangChain tools ───────────────────────────────────────

@tool
def get_admanager(dias: int = 30) -> str:
    """
    Consulta los ingresos diarios de Ad Manager (publicidad web) para los últimos N días.
    Devuelve totales en USD y COP, impresiones, eCPM y variación vs período anterior.
    Úsala para preguntas sobre ingresos de publicidad web, portal, o Ad Manager.
    """
    result = get_admanager_data(dias=dias)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool
def get_youtube(meses: int = 3, canal: str = "TOTAL") -> str:
    """
    Consulta los ingresos mensuales de YouTube para los últimos N meses.
    Canal puede ser: TOTAL, RedMasTv, RedMasNoticias, QuinceMinutos, RadiolaTv.
    Devuelve ingresos brutos, retención, neto por mes y variación vs mes anterior.
    Úsala para preguntas sobre YouTube, canales de video, o plataformas de streaming.
    """
    canal_param = None if canal.upper() == "TOTAL" else canal
    result = get_youtube_data(meses=meses, canal=canal_param)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool
def get_facebook(meses: int = 3) -> str:
    """
    Consulta los ingresos mensuales de Facebook para los últimos N meses.
    Devuelve ingresos brutos, retención, neto y variación vs mes anterior.
    Úsala para preguntas sobre Facebook o redes sociales.
    """
    result = get_facebook_data(meses=meses)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool
def get_presupuesto(meses: int = 3, seccion: str = "") -> str:
    """
    Consulta el presupuesto vs ejecución real para los últimos N meses.
    Puede filtrar por sección (ej: 'produccion', 'marketing', 'operaciones').
    Devuelve % de ejecución, estado (normal/en_riesgo/sobre_presupuesto) por sección.
    Úsala para preguntas sobre presupuesto, gastos, ejecución o cumplimiento financiero.
    """
    sec = seccion if seccion.strip() else None
    result = get_presupuesto_data(meses=meses, seccion=sec)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool
def get_resumen_diario() -> str:
    """
    Genera un resumen completo de todas las fuentes de ingresos y presupuesto.
    Incluye último dato disponible de Ad Manager, YouTube, Facebook y estado del presupuesto.
    Úsala para preguntas generales como '¿cómo vamos?', '¿qué pasó hoy?', o 'dame un resumen'.
    """
    result = get_daily_summary()
    return json.dumps(result, ensure_ascii=False, default=str)


# ── Estado del Agente ─────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], lambda x, y: list(x) + list(y)]


# ── Construir el Grafo LangGraph ──────────────────────────────────────────────

TOOLS = [get_admanager, get_youtube, get_facebook, get_presupuesto, get_resumen_diario]

def build_agent():
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        api_key=os.getenv("GROQ_API_KEY"),
    ).bind_tools(TOOLS)

    tool_node = ToolNode(TOOLS)

    def call_model(state: AgentState):
        messages = state["messages"]
        # Inyectar system prompt si es el primer mensaje
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(messages)
        response = llm.invoke(messages)
        return {"messages": [response]}

    def should_continue(state: AgentState):
        last = state["messages"][-1]
        if hasattr(last, "tool_calls") and last.tool_calls:
            return "tools"
        return END

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "agent")

    return graph.compile()


# Instancia global del agente (se inicializa una vez al arrancar)
_agent_instance = None

def get_agent():
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = build_agent()
    return _agent_instance


# ── Función principal de chat ─────────────────────────────────────────────────

async def chat(message: str, history: list[dict]) -> str:
    """
    Procesa un mensaje del usuario y devuelve la respuesta del agente.
    history: lista de dicts con {role: 'user'|'assistant', content: str}
    """
    agent = get_agent()

    # Convertir historial al formato LangChain
    lc_messages: list[BaseMessage] = []
    for msg in history[-10:]:  # Últimos 10 mensajes para contexto
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    # Agregar el mensaje actual
    lc_messages.append(HumanMessage(content=message))

    # Ejecutar el agente
    result = await agent.ainvoke({"messages": lc_messages})

    # Extraer la última respuesta del AI
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            return str(msg.content)

    return "Lo siento, no pude generar una respuesta. Por favor intenta de nuevo."
