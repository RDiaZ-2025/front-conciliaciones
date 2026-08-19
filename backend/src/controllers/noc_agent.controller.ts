import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppDataSource } from '../config/typeorm.config';
import { IngresoPortal } from '../models/IngresoPortal';
import { IngresoRedes } from '../models/IngresoRedes';
import { Presupuesto } from '../models/Presupuesto';
import axios from 'axios';

// System Prompt for Groq
const SYSTEM_PROMPT = `Eres el Asistente Financiero de RED+, un grupo de medios colombiano.
Tienes acceso a herramientas y datos en tiempo real de la base de datos de la empresa, inyectados en tu contexto.

Instrucciones:
- Responde SIEMPRE en español.
- Usa los datos reales del contexto de base de datos inyectado, nunca inventes cifras.
- Cuando muestres valores monetarios, usa formato USD con símbolo $ y separadores de miles (ej. $12,500.50). Si se especifican en COP, indícalo claramente con símbolo $ COP.
- Cuando calcules variaciones, indica claramente si sube 📈 o baja 📉.
- Si no hay datos disponibles para un período solicitado por el usuario, dilo claramente y sugiere consultar otro período.
- Sé conciso pero completo. Usa emojis sutiles para mejorar la legibilidad.
- Para preguntas de presupuesto, siempre menciona el % de ejecución y su estado de riesgo.
`;

const _safe = (val: any): number => {
  if (val === null || val === undefined || isNaN(Number(val))) return 0.0;
  return Number(val);
};

const _variacion = (actual: number, anterior: number) => {
  if (anterior === 0) {
    return { diferencia: actual, porcentaje: 0, tendencia: "sin_dato_previo" };
  }
  const diff = actual - anterior;
  const pct = (diff / anterior) * 100;
  return {
    diferencia: Number(diff.toFixed(2)),
    porcentaje: Number(pct.toFixed(2)),
    tendencia: pct > 0 ? "sube" : pct < 0 ? "baja" : "estable"
  };
};

// Data retrieval functions
async function getAdmanagerData(dias = 30) {
  const repo = AppDataSource.getRepository(IngresoPortal);
  const hoy = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  const inicioAnt = new Date(inicio.getTime());
  inicioAnt.setDate(inicioAnt.getDate() - dias);

  const format = (d: Date) => d.toISOString().split('T')[0];

  const registros = await repo.createQueryBuilder('ip')
    .where('ip.fecha >= :inicio AND ip.fecha <= :hoy', { inicio: format(inicio), hoy: format(hoy) })
    .orderBy('ip.fecha', 'DESC')
    .getMany();

  const registrosAnt = await repo.createQueryBuilder('ip')
    .where('ip.fecha >= :inicioAnt AND ip.fecha < :inicio', { inicioAnt: format(inicioAnt), inicio: format(inicio) })
    .orderBy('ip.fecha', 'DESC')
    .getMany();

  const totalUsd = registros.reduce((acc, r) => acc + _safe(r.usd), 0);
  const totalUsdAnt = registrosAnt.reduce((acc, r) => acc + _safe(r.usd), 0);

  const totalCop = registros.reduce((acc, r) => acc + _safe(r.cop), 0);
  const totalImpresiones = registros.reduce((acc, r) => acc + _safe(r.impresionesTotales), 0);
  const ecpmProm = registros.length > 0
    ? registros.reduce((acc, r) => acc + _safe(r.promedioAdExchange), 0) / registros.length
    : 0;

  const ultimo = registros[0] || null;

  return {
    fuente: "Ad Manager",
    periodo_dias: dias,
    fecha_inicio: format(inicio),
    fecha_fin: format(hoy),
    ultimo_registro: ultimo?.fecha ? format(new Date(ultimo.fecha)) : "sin datos",
    total_usd: Number(totalUsd.toFixed(2)),
    total_cop: Math.round(totalCop),
    total_impresiones: totalImpresiones,
    ecpm_promedio: Number(ecpmProm.toFixed(4)),
    registros_count: registros.length,
    variacion_vs_periodo_anterior: _variacion(totalUsd, totalUsdAnt),
    detalle_reciente: registros.slice(0, 7).map(r => ({
      fecha: r.fecha ? format(new Date(r.fecha)) : '',
      usd: _safe(r.usd),
      cop: _safe(r.cop),
      impresiones: _safe(r.impresionesTotales),
      ecpm: _safe(r.promedioAdExchange)
    }))
  };
}

async function getYoutubeData(meses = 3) {
  const repo = AppDataSource.getRepository(IngresoRedes);
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - meses, 1);

  const format = (d: Date) => d.toISOString().split('T')[0];

  const registros = await repo.createQueryBuilder('ir')
    .where('UPPER(ir.plataforma) = :platform', { platform: 'YOUTUBE' })
    .andWhere('ir.mes >= :inicio', { inicio: format(inicio) })
    .orderBy('ir.mes', 'DESC')
    .getMany();

  if (!registros.length) {
    return { fuente: "YouTube", mensaje: "Sin datos disponibles", meses_analizados: meses };
  }

  const filas = registros.map(r => ({
    mes: format(new Date(r.mes)),
    total_bruto: _safe(r.totalBruto),
    retencion: _safe(r.retencion),
    total_neto: _safe(r.totalNeto),
    canales: {
      RedMasTv: _safe(r.redMasTv),
      RedMasNoticias: _safe(r.redMasNoticias),
      QuinceMinutos: _safe(r.quinceMinutos),
      RadiolaTv: _safe(r.radiolaTv)
    }
  }));

  const varLast = filas.length >= 2 ? _variacion(filas[0].total_neto, filas[1].total_neto) : { diferencia: 0, porcentaje: 0, tendencia: 'sin_datos' };

  const ultimo = registros[0];
  const canales = {
    RedMasTv: _safe(ultimo.redMasTv),
    RedMasNoticias: _safe(ultimo.redMasNoticias),
    QuinceMinutos: _safe(ultimo.quinceMinutos),
    RadiolaTv: _safe(ultimo.radiolaTv)
  };
  const mejorCanal = Object.entries(canales).sort((a, b) => b[1] - a[1])[0];

  return {
    fuente: "YouTube",
    meses_analizados: registros.length,
    total_neto_acumulado: Number(registros.reduce((acc, r) => acc + _safe(r.totalNeto), 0).toFixed(2)),
    mes_mas_reciente: format(new Date(registros[0].mes)),
    variacion_ultimo_mes: varLast,
    mejor_canal_ultimo_mes: mejorCanal ? { canal: mejorCanal[0], usd: mejorCanal[1] } : null,
    detalle_por_mes: filas
  };
}

async function getFacebookData(meses = 3) {
  const repo = AppDataSource.getRepository(IngresoRedes);
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - meses, 1);

  const format = (d: Date) => d.toISOString().split('T')[0];

  const registros = await repo.createQueryBuilder('ir')
    .where('UPPER(ir.plataforma) = :platform', { platform: 'FACEBOOK' })
    .andWhere('ir.mes >= :inicio', { inicio: format(inicio) })
    .orderBy('ir.mes', 'DESC')
    .getMany();

  if (!registros.length) {
    return { fuente: "Facebook", mensaje: "Sin datos disponibles", meses_analizados: meses };
  }

  const filas = registros.map(r => ({
    mes: format(new Date(r.mes)),
    total_bruto: _safe(r.totalBruto),
    retencion: _safe(r.retencion),
    total_neto: _safe(r.totalNeto)
  }));

  const varLast = filas.length >= 2 ? _variacion(filas[0].total_neto, filas[1].total_neto) : { diferencia: 0, porcentaje: 0, tendencia: 'sin_datos' };

  return {
    fuente: "Facebook",
    meses_analizados: registros.length,
    total_neto_acumulado: Number(registros.reduce((acc, r) => acc + _safe(r.totalNeto), 0).toFixed(2)),
    mes_mas_reciente: format(new Date(registros[0].mes)),
    variacion_ultimo_mes: varLast,
    detalle_por_mes: filas
  };
}

async function getPresupuestoData(meses = 3) {
  const repo = AppDataSource.getRepository(Presupuesto);
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - meses, 1);

  const format = (d: Date) => d.toISOString().split('T')[0];

  const registros = await repo.createQueryBuilder('p')
    .where('p.fecha >= :inicio', { inicio: format(inicio) })
    .orderBy('p.fecha', 'DESC')
    .getMany();

  if (!registros.length) {
    return { fuente: "Presupuesto", mensaje: "Sin datos disponibles" };
  }

  const totalPpto = registros.reduce((acc, r) => acc + _safe(r.ppto), 0);
  const totalEjec = registros.reduce((acc, r) => acc + _safe(r.ejecucion), 0);
  const pctEjecucion = totalPpto > 0 ? (totalEjec / totalPpto * 100) : 0;

  const secciones: Record<string, { presupuesto: number, execution: number, ejecucion?: number, pct_ejecucion?: number, estado?: string }> = {};
  for (const r of registros) {
    const s = r.seccion || "Sin sección";
    if (!secciones[s]) {
      secciones[s] = { presupuesto: 0, execution: 0 };
    }
    secciones[s].presupuesto += _safe(r.ppto);
    secciones[s].execution += _safe(r.ejecucion);
  }

  for (const s in secciones) {
    const p = secciones[s].presupuesto;
    const e = secciones[s].execution;
    secciones[s].ejecucion = e;
    secciones[s].pct_ejecucion = Number((p > 0 ? (e / p * 100) : 0).toFixed(1));
    secciones[s].estado = e > p
      ? "sobre_presupuesto"
      : (p > 0 ? (e / p * 100) : 0) > 85 ? "en_riesgo" : "normal";
  }

  return {
    fuente: "Presupuesto",
    periodo_analizado: `últimos ${meses} meses`,
    total_presupuestado: Number(totalPpto.toFixed(2)),
    total_ejecutado: Number(totalEjec.toFixed(2)),
    porcentaje_ejecucion_global: Number(pctEjecucion.toFixed(1)),
    estado_global: totalEjec > totalPpto ? "sobre_presupuesto" : pctEjecucion > 85 ? "en_riesgo" : "normal",
    por_seccion: secciones
  };
}

export class NocAgentController {
  agentChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { message, history } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
      return;
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Variable GROQ_API_KEY no configurada. Retornando respuesta informativa.");
      res.status(200).json({
        response: "🤖 Hola. El servicio de inteligencia artificial no está completamente configurado porque la variable de entorno GROQ_API_KEY no fue encontrada en el servidor. Por favor, configura tu API Key de Groq en el archivo .env del backend."
      });
      return;
    }

    try {
      // 1. Fetch DB summaries for context (RAG)
      const admanager = await getAdmanagerData(30);
      const youtube = await getYoutubeData(3);
      const facebook = await getFacebookData(3);
      const presupuesto = await getPresupuestoData(3);

      const context = `
### DATOS RECIENTES DE CONCILIACIONES Y FINANZAS DE RED+ (CONTEXTO DE BD)

#### 1. AD MANAGER (Ingresos diarios de portal web - Últimos 30 días)
- Rango: ${admanager.fecha_inicio} a ${admanager.fecha_fin}
- Último Registro: ${admanager.ultimo_registro}
- Total USD: $${admanager.total_usd.toLocaleString()} USD
- Total COP Equivalente: $${admanager.total_cop.toLocaleString()} COP
- Impresiones Totales: ${admanager.total_impresiones.toLocaleString()}
- eCPM Promedio: $${admanager.ecpm_promedio} USD
- Variación vs Período Anterior: Diferencia $${admanager.variacion_vs_periodo_anterior.diferencia.toLocaleString()} USD (${admanager.variacion_vs_periodo_anterior.porcentaje}%, tendencia: ${admanager.variacion_vs_periodo_anterior.tendencia === 'sube' ? 'sube 📈' : admanager.variacion_vs_periodo_anterior.tendencia === 'baja' ? 'baja 📉' : 'estable'})
- Detalle últimos días:
${admanager.detalle_reciente.map(d => `  - ${d.fecha}: $${d.usd} USD, ${d.impresiones.toLocaleString()} imp, eCPM: $${d.ecpm}`).join('\n')}

#### 2. YOUTUBE (Ingresos Mensuales)
- Meses analizados: ${youtube.meses_analizados} (Más reciente: ${youtube.mes_mas_reciente})
- Total Neto Acumulado: $${youtube.total_neto_acumulado?.toLocaleString()} USD
- Variación Último Mes: Diferencia $${youtube.variacion_ultimo_mes?.diferencia?.toLocaleString()} USD (${youtube.variacion_ultimo_mes?.porcentaje}%, tendencia: ${youtube.variacion_ultimo_mes?.tendencia === 'sube' ? 'sube 📈' : 'baja 📉'})
- Mejor Canal Último Mes: ${youtube.mejor_canal_ultimo_mes?.canal} ($${youtube.mejor_canal_ultimo_mes?.usd?.toLocaleString()} USD)
- Detalle por mes:
${(youtube.detalle_por_mes || []).map(m => `  - ${m.mes}: Neto $${m.total_neto.toLocaleString()} USD (Bruto: $${m.total_bruto.toLocaleString()}, Retención: $${m.retencion.toLocaleString()}) [Canales: RedMasTv: $${m.canales?.RedMasTv?.toLocaleString()}, RedMasNoticias: $${m.canales?.RedMasNoticias?.toLocaleString()}, QuinceMinutos: $${m.canales?.QuinceMinutos?.toLocaleString()}, RadiolaTv: $${m.canales?.RadiolaTv?.toLocaleString()}]`).join('\n')}

#### 3. FACEBOOK (Ingresos Mensuales)
- Meses analizados: ${facebook.meses_analizados} (Más reciente: ${facebook.mes_mas_reciente})
- Total Neto Acumulado: $${facebook.total_neto_acumulado?.toLocaleString()} USD
- Variación Último Mes: Diferencia $${facebook.variacion_ultimo_mes?.diferencia?.toLocaleString()} USD (${facebook.variacion_ultimo_mes?.porcentaje}%, tendencia: ${facebook.variacion_ultimo_mes?.tendencia === 'sube' ? 'sube 📈' : 'baja 📉'})
- Detalle por mes:
${(facebook.detalle_por_mes || []).map(m => `  - ${m.mes}: Neto $${m.total_neto.toLocaleString()} USD (Bruto: $${m.total_bruto.toLocaleString()}, Retención: $${m.retencion.toLocaleString()})`).join('\n')}

#### 4. PRESUPUESTO Y GASTOS DE SECCIONES (Últimos 3 meses)
- Total Presupuestado: $${presupuesto.total_presupuestado?.toLocaleString()}
- Total Ejecutado: $${presupuesto.total_ejecutado?.toLocaleString()}
- Ejecución Global: ${presupuesto.porcentaje_ejecucion_global}% (Estado: ${presupuesto.estado_global === 'sobre_presupuesto' ? 'sobre presupuesto ⚠️' : presupuesto.estado_global === 'en_riesgo' ? 'en riesgo 🟡' : 'normal ✅'})
- Ejecución por Sección:
${Object.entries(presupuesto.por_seccion || {}).map(([sec, sData]: any) => `  - ${sec}: Ppto: $${sData.presupuesto.toLocaleString()}, Ejecución: $${sData.ejecucion.toLocaleString()} (${sData.pct_ejecucion}%, estado: ${sData.estado})`).join('\n')}
`;

      // 2. Format messages for Groq API
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `El contexto actual de la base de datos es el siguiente:\n${context}` }
      ];

      // Add conversation history
      if (history && Array.isArray(history)) {
        for (const msg of history.slice(-10)) { // Limit to last 10 messages for token context
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          });
        }
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // 3. Request completion from Groq API
      const groqResponse = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const responseText = groqResponse.data?.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta. Por favor intenta de nuevo.";

      res.status(200).json({
        response: responseText
      });

    } catch (e: any) {
      console.error("Error en el agente de chat:", e.response?.data || e.message);
      res.status(500).json({ message: `Error en el agente: ${e.response?.data?.error?.message || e.message}` });
    }
  });

  agentHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: "ok",
      agent: "Red+ Financial Agent v1.0 (Node.js)"
    });
  });
}
