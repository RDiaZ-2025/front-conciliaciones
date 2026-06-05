"""
tools.py — Herramientas tipadas del Agente IA Red+
Cada función consulta la base de datos y devuelve datos estructurados
para que el LLM pueda razonar sobre ellos.
"""
from datetime import date, datetime, timedelta
from typing import Optional
import math

from sqlalchemy.orm import Session
from sqlalchemy import func

from database import SessionLocal
from modules.portal.ingresos.models import IngresoPortal, IngresoRedes, PrecioDolar
from modules.portal.presupuesto.models import Presupuesto


# ── Utilidades ────────────────────────────────────────────────────────────────

def _db() -> Session:
    return SessionLocal()

def _safe(val) -> float:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return 0.0
    return float(val)

def _variacion(actual: float, anterior: float) -> dict:
    if anterior == 0:
        return {"diferencia": actual, "porcentaje": None, "tendencia": "sin_dato_previo"}
    diff = actual - anterior
    pct = (diff / anterior) * 100
    return {
        "diferencia": round(diff, 2),
        "porcentaje": round(pct, 2),
        "tendencia": "sube" if pct > 0 else "baja" if pct < 0 else "estable",
    }


# ── Tool 1: Ad Manager (datos diarios) ───────────────────────────────────────

def get_admanager_data(dias: int = 30) -> dict:
    """
    Obtiene ingresos diarios de Ad Manager para los últimos N días.
    Calcula la variación vs el período anterior equivalente.
    """
    db = _db()
    try:
        hoy = date.today()
        inicio = hoy - timedelta(days=dias)
        inicio_ant = inicio - timedelta(days=dias)

        # Período actual
        registros = (
            db.query(IngresoPortal)
            .filter(IngresoPortal.Fecha >= inicio, IngresoPortal.Fecha <= hoy)
            .order_by(IngresoPortal.Fecha.desc())
            .all()
        )

        # Período anterior
        registros_ant = (
            db.query(IngresoPortal)
            .filter(IngresoPortal.Fecha >= inicio_ant, IngresoPortal.Fecha < inicio)
            .order_by(IngresoPortal.Fecha.desc())
            .all()
        )

        total_usd = sum(_safe(r.USD) for r in registros)
        total_usd_ant = sum(_safe(r.USD) for r in registros_ant)

        total_cop = sum(_safe(r.COP) for r in registros)
        total_impresiones = sum(r.ImpresionesTotales or 0 for r in registros)
        ecpm_prom = (
            sum(_safe(r.PromedioAdExchange) for r in registros) / len(registros)
            if registros else 0
        )

        # Último registro disponible
        ultimo = registros[0] if registros else None

        return {
            "fuente": "Ad Manager",
            "periodo_dias": dias,
            "fecha_inicio": str(inicio),
            "fecha_fin": str(hoy),
            "ultimo_registro": str(ultimo.Fecha) if ultimo else "sin datos",
            "total_usd": round(total_usd, 2),
            "total_cop": round(total_cop, 0),
            "total_impresiones": total_impresiones,
            "ecpm_promedio": round(ecpm_prom, 4),
            "registros_count": len(registros),
            "variacion_vs_periodo_anterior": _variacion(total_usd, total_usd_ant),
            "detalle_reciente": [
                {
                    "fecha": str(r.Fecha),
                    "usd": _safe(r.USD),
                    "cop": _safe(r.COP),
                    "impresiones": r.ImpresionesTotales or 0,
                    "ecpm": _safe(r.PromedioAdExchange),
                }
                for r in registros[:7]  # últimos 7 días en detalle
            ],
        }
    finally:
        db.close()


# ── Tool 2: YouTube (datos mensuales) ────────────────────────────────────────

def get_youtube_data(meses: int = 3, canal: Optional[str] = None) -> dict:
    """
    Obtiene ingresos mensuales de YouTube para los últimos N meses.
    Puede filtrar por canal: RedMasTv, RedMasNoticias, QuinceMinutos, RadiolaTv, o TOTAL.
    """
    db = _db()
    try:
        hoy = date.today()
        # Primer día del mes actual menos N meses
        inicio = date(hoy.year, hoy.month, 1) - timedelta(days=meses * 30)
        inicio = date(inicio.year, inicio.month, 1)

        registros = (
            db.query(IngresoRedes)
            .filter(
                func.upper(IngresoRedes.Plataforma) == "YOUTUBE",
                IngresoRedes.Mes >= inicio,
            )
            .order_by(IngresoRedes.Mes.desc())
            .all()
        )

        if not registros:
            return {"fuente": "YouTube", "mensaje": "Sin datos disponibles", "meses_solicitados": meses}

        def _fila(r):
            base = {
                "mes": str(r.Mes),
                "total_bruto": _safe(r.TotalBruto),
                "retencion": _safe(r.Retencion),
                "total_neto": _safe(r.TotalNeto),
            }
            if not canal or canal.upper() == "TOTAL":
                base["canales"] = {
                    "RedMasTv": _safe(r.RedMasTv),
                    "RedMasNoticias": _safe(r.RedMasNoticias),
                    "QuinceMinutos": _safe(r.QuinceMinutos),
                    "RadiolaTv": _safe(r.RadiolaTv),
                }
            return base

        filas = [_fila(r) for r in registros]

        # Variación último mes vs penúltimo
        var = {}
        if len(filas) >= 2:
            var = _variacion(filas[0]["total_neto"], filas[1]["total_neto"])

        # Mejor canal del último mes
        ultimo = registros[0]
        canales = {
            "RedMasTv": _safe(ultimo.RedMasTv),
            "RedMasNoticias": _safe(ultimo.RedMasNoticias),
            "QuinceMinutos": _safe(ultimo.QuinceMinutos),
            "RadiolaTv": _safe(ultimo.RadiolaTv),
        }
        mejor_canal = max(canales, key=canales.get)

        return {
            "fuente": "YouTube",
            "meses_analizados": len(registros),
            "total_neto_acumulado": round(sum(_safe(r.TotalNeto) for r in registros), 2),
            "mes_mas_reciente": str(registros[0].Mes),
            "variacion_ultimo_mes": var,
            "mejor_canal_ultimo_mes": {"canal": mejor_canal, "usd": canales[mejor_canal]},
            "detalle_por_mes": filas,
        }
    finally:
        db.close()


# ── Tool 3: Facebook (datos mensuales) ───────────────────────────────────────

def get_facebook_data(meses: int = 3) -> dict:
    """
    Obtiene ingresos mensuales de Facebook para los últimos N meses.
    """
    db = _db()
    try:
        hoy = date.today()
        inicio = date(hoy.year, hoy.month, 1) - timedelta(days=meses * 30)
        inicio = date(inicio.year, inicio.month, 1)

        registros = (
            db.query(IngresoRedes)
            .filter(
                func.upper(IngresoRedes.Plataforma) == "FACEBOOK",
                IngresoRedes.Mes >= inicio,
            )
            .order_by(IngresoRedes.Mes.desc())
            .all()
        )

        if not registros:
            return {"fuente": "Facebook", "mensaje": "Sin datos disponibles", "meses_solicitados": meses}

        filas = [
            {
                "mes": str(r.Mes),
                "total_bruto": _safe(r.TotalBruto),
                "retencion": _safe(r.Retencion),
                "total_neto": _safe(r.TotalNeto),
            }
            for r in registros
        ]

        var = {}
        if len(filas) >= 2:
            var = _variacion(filas[0]["total_neto"], filas[1]["total_neto"])

        return {
            "fuente": "Facebook",
            "meses_analizados": len(registros),
            "total_neto_acumulado": round(sum(_safe(r.TotalNeto) for r in registros), 2),
            "mes_mas_reciente": str(registros[0].Mes),
            "variacion_ultimo_mes": var,
            "detalle_por_mes": filas,
        }
    finally:
        db.close()


# ── Tool 4: Presupuesto ───────────────────────────────────────────────────────

def get_presupuesto_data(meses: int = 3, seccion: Optional[str] = None) -> dict:
    """
    Obtiene datos de presupuesto vs ejecución para los últimos N meses.
    Puede filtrar por sección.
    """
    db = _db()
    try:
        hoy = date.today()
        inicio = date(hoy.year, hoy.month, 1) - timedelta(days=meses * 30)
        inicio = date(inicio.year, inicio.month, 1)

        query = db.query(Presupuesto).filter(Presupuesto.Fecha >= inicio)
        if seccion:
            query = query.filter(Presupuesto.Seccion.ilike(f"%{seccion}%"))

        registros = query.order_by(Presupuesto.Fecha.desc()).all()

        if not registros:
            return {"fuente": "Presupuesto", "mensaje": "Sin datos disponibles"}

        total_ppto = sum(_safe(r.Ppto) for r in registros)
        total_ejec = sum(_safe(r.Ejecucion) for r in registros)
        pct_ejecucion = (total_ejec / total_ppto * 100) if total_ppto > 0 else 0

        # Agrupar por sección
        secciones: dict = {}
        for r in registros:
            s = r.Seccion or "Sin sección"
            if s not in secciones:
                secciones[s] = {"presupuesto": 0, "ejecucion": 0}
            secciones[s]["presupuesto"] += _safe(r.Ppto)
            secciones[s]["ejecucion"] += _safe(r.Ejecucion)

        for s in secciones:
            p = secciones[s]["presupuesto"]
            e = secciones[s]["ejecucion"]
            secciones[s]["pct_ejecucion"] = round((e / p * 100) if p > 0 else 0, 1)
            secciones[s]["estado"] = (
                "sobre_presupuesto" if e > p else
                "en_riesgo" if (e / p * 100 if p > 0 else 0) > 85 else
                "normal"
            )

        return {
            "fuente": "Presupuesto",
            "periodo_analizado": f"últimos {meses} meses",
            "total_presupuestado": round(total_ppto, 2),
            "total_ejecutado": round(total_ejec, 2),
            "porcentaje_ejecucion_global": round(pct_ejecucion, 1),
            "estado_global": (
                "sobre_presupuesto" if total_ejec > total_ppto else
                "en_riesgo" if pct_ejecucion > 85 else "normal"
            ),
            "por_seccion": secciones,
        }
    finally:
        db.close()


# ── Tool 5: Resumen Diario ────────────────────────────────────────────────────

def get_daily_summary() -> dict:
    """
    Genera un resumen completo de todos los módulos: último dato disponible,
    variaciones recientes y estado del presupuesto.
    """
    admanager = get_admanager_data(dias=30)
    youtube = get_youtube_data(meses=2)
    facebook = get_facebook_data(meses=2)
    presupuesto = get_presupuesto_data(meses=1)

    hoy = date.today()

    return {
        "fecha_resumen": str(hoy),
        "admanager": {
            "ultimo_registro": admanager.get("ultimo_registro"),
            "total_usd_30d": admanager.get("total_usd"),
            "variacion_vs_30d_anterior": admanager.get("variacion_vs_periodo_anterior"),
        },
        "youtube": {
            "mes_reciente": youtube.get("mes_mas_reciente"),
            "total_neto": youtube.get("total_neto_acumulado"),
            "variacion_vs_mes_anterior": youtube.get("variacion_ultimo_mes"),
            "mejor_canal": youtube.get("mejor_canal_ultimo_mes"),
        },
        "facebook": {
            "mes_reciente": facebook.get("mes_mas_reciente"),
            "total_neto": facebook.get("total_neto_acumulado"),
            "variacion_vs_mes_anterior": facebook.get("variacion_ultimo_mes"),
        },
        "presupuesto": {
            "porcentaje_ejecucion": presupuesto.get("porcentaje_ejecucion_global"),
            "estado": presupuesto.get("estado_global"),
            "total_ppto": presupuesto.get("total_presupuestado"),
            "total_ejecutado": presupuesto.get("total_ejecutado"),
        },
    }
