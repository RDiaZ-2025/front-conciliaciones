import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppDataSource } from '../config/typeorm.config';
import { IngresoPortal } from '../models/IngresoPortal';
import { IngresoRedes } from '../models/IngresoRedes';

export class NocIngresosController {
  getIngresosGrafico = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const limite = Number(req.query.limite || 2000);
    const repo = AppDataSource.getRepository(IngresoPortal);

    const resultadosDesc = await repo.find({
      order: { fecha: 'DESC' },
      take: limite
    });

    const resultados = [...resultadosDesc].reverse();

    if (!resultados.length) {
      res.status(200).json({ fechas: [], datasets: {} });
      return;
    }

    const formatDate = (d: Date | null) => d ? d.toISOString().split('T')[0] : '';

    const fechas = resultados.map(r => formatDate(r.fecha));
    const revenue = resultados.map(r => Number(r.ingresosAdExchange || 0));
    const ecpm = resultados.map(r => Number(r.promedioAdExchange || 0));
    const impresiones = resultados.map(r => Number(r.impresionesTotales || 0));
    const impresiones_sin_rellenar = resultados.map(r => Number(r.impresionesSinRellenar || 0));

    res.status(200).json({
      fechas,
      datasets: {
        revenue,
        ecpm,
        impresiones,
        impresiones_sin_rellenar
      }
    });
  });

  getIngresosRedes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const { plataforma } = req.params;
    const limite = Number(req.query.limite || 200);

    const repo = AppDataSource.getRepository(IngresoRedes);
    const query = repo.createQueryBuilder('r')
      .where('UPPER(r.plataforma) = :plataforma', { plataforma: plataforma.toUpperCase() })
      .orderBy('r.mes', 'DESC')
      .take(limite);

    const resultadosDesc = await query.getMany();
    const resultados = [...resultadosDesc].reverse();

    if (!resultados.length) {
      res.status(200).json({ fechas: [], datasets: {} });
      return;
    }

    const formatDate = (d: Date) => d ? d.toISOString().split('T')[0] : '';

    const fechas = resultados.map(r => formatDate(r.mes));
    const total_bruto = resultados.map(r => Number(r.totalBruto || 0));
    const retencion = resultados.map(r => Number(r.retencion || 0));
    const total_neto = resultados.map(r => Number(r.totalNeto || 0));

    const red_mas_tv = resultados.map(r => Number(r.redMasTv || 0));
    const red_mas_noticias = resultados.map(r => Number(r.redMasNoticias || 0));
    const quince_minutos = resultados.map(r => Number(r.quinceMinutos || 0));
    const radiola_tv = resultados.map(r => Number(r.radiolaTv || 0));

    res.status(200).json({
      fechas,
      datasets: {
        total_bruto,
        retencion,
        total_neto,
        canales: {
          red_mas_tv,
          red_mas_noticias,
          quince_minutos,
          radiola_tv
        }
      }
    });
  });

  getResumenGeneral = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    // Portal totals
    const portalSumRaw = await AppDataSource.getRepository(IngresoPortal).createQueryBuilder('ip')
      .select('SUM(ip.ingresosAdExchange)', 'total')
      .getRawOne();
    const totalAdmanager = Number(portalSumRaw?.total || 0);

    // Youtube totals
    const youtubeSumRaw = await AppDataSource.getRepository(IngresoRedes).createQueryBuilder('ir')
      .select('SUM(ir.totalNeto)', 'total')
      .where('UPPER(ir.plataforma) = :platform', { platform: 'YOUTUBE' })
      .getRawOne();
    const totalYoutube = Number(youtubeSumRaw?.total || 0);

    // Facebook totals
    const fbSumRaw = await AppDataSource.getRepository(IngresoRedes).createQueryBuilder('ir')
      .select('SUM(ir.totalNeto)', 'total')
      .where('UPPER(ir.plataforma) = :platform', { platform: 'FACEBOOK' })
      .getRawOne();
    const totalFacebook = Number(fbSumRaw?.total || 0);

    res.status(200).json({
      admanager_total: totalAdmanager,
      youtube_total_neto: totalYoutube,
      facebook_total: totalFacebook,
      total_global_usd: totalAdmanager + totalYoutube + totalFacebook
    });
  });
}
