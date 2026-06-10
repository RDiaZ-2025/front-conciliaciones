import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppDataSource } from '../config/typeorm.config';
import { Presupuesto } from '../models/Presupuesto';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';

function sheetToJSON(worksheet: any, startRow: number = 1): any[] {
  const rows: any[] = [];
  const headerRow = worksheet.getRow(startRow);
  const headers: string[] = [];
  
  headerRow.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
    let val = cell.value;
    if (val && typeof val === 'object' && 'result' in val) {
      val = val.result;
    }
    headers[colNumber] = val ? String(val).trim() : '';
  });

  worksheet.eachRow({ includeEmpty: false }, (row: any, rowNumber: number) => {
    if (rowNumber <= startRow) return;

    const rowData: any = {};
    let hasData = false;
    row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
      const header = headers[colNumber];
      if (header) {
        let val = cell.value;
        if (val && typeof val === 'object') {
          if ('result' in val) val = val.result;
          else if ('text' in val) val = val.text;
        }
        rowData[header] = val;
        hasData = true;
      }
    });
    if (hasData) {
      rows.push(rowData);
    }
  });

  return rows;
}

const calcularPorcentaje = (ppto: number, ejecucion: number): number => {
  if (ppto === 0 && ejecucion > 0) return 100.0;
  if (ppto === 0 && ejecucion === 0) return 0.0;
  return Number(((ejecucion / ppto) * 100).toFixed(2));
};

export class NocPresupuestoController {
  getDashboardPresupuesto = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    const year = Number(req.query.year || 2026);
    const filter_type = String(req.query.filter_type || 'TOTAL');

    // 1. Get max month from presupuesto where execution > 0 for this year
    const maxMonthRaw = await AppDataSource.getRepository(Presupuesto).createQueryBuilder('p')
      .select('MAX(MONTH(p.fecha))', 'max_month')
      .where('p.ejecucion > 0')
      .andWhere('YEAR(p.fecha) = :year', { year })
      .getRawOne();
    
    const maxMonth = maxMonthRaw?.max_month ? Number(maxMonthRaw.max_month) : 12;

    let startMonth = 1;
    let endMonth = 12;

    if (filter_type === 'LAST_MONTH') {
      startMonth = maxMonth;
      endMonth = maxMonth;
    } else if (filter_type === 'LAST_3_MONTHS') {
      startMonth = Math.max(1, maxMonth - 2);
      endMonth = maxMonth;
    } else if (filter_type === 'YTD') {
      startMonth = 1;
      endMonth = maxMonth;
    }

    // 2. Monthly Summary
    const mensualQuery = await AppDataSource.getRepository(Presupuesto).createQueryBuilder('p')
      .select('p.fecha', 'fecha')
      .addSelect('SUM(p.ppto)', 'total_ppto')
      .addSelect('SUM(p.ejecucion)', 'total_ejecucion')
      .where('YEAR(p.fecha) = :year', { year })
      .andWhere('MONTH(p.fecha) >= :startMonth AND MONTH(p.fecha) <= :endMonth', { startMonth, endMonth })
      .groupBy('p.fecha')
      .orderBy('p.fecha')
      .getRawMany();

    const resumen_mensual = [];
    let total_anual_ppto = 0.0;
    let total_anual_ejecucion = 0.0;

    for (const r of mensualQuery) {
      const ppto = Number(r.total_ppto || 0);
      const ejec = Number(r.total_ejecucion || 0);
      total_anual_ppto += ppto;
      total_anual_ejecucion += ejec;

      resumen_mensual.push({
        mes: r.fecha,
        total_ppto: ppto,
        total_ejecucion: ejec,
        diferencia: ppto - ejec,
        porcentaje_cumplimiento: calcularPorcentaje(ppto, ejec)
      });
    }

    // 3. Breakdown by Source
    const fuentesQuery = await AppDataSource.getRepository(Presupuesto).createQueryBuilder('p')
      .select('p.seccion', 'seccion')
      .addSelect('p.fuente', 'fuente')
      .addSelect('SUM(p.ppto)', 'total_ppto')
      .addSelect('SUM(p.ejecucion)', 'total_ejecucion')
      .where('YEAR(p.fecha) = :year', { year })
      .andWhere('MONTH(p.fecha) >= :startMonth AND MONTH(p.fecha) <= :endMonth', { startMonth, endMonth })
      .groupBy('p.seccion')
      .addGroupBy('p.fuente')
      .getRawMany();

    const desglose_fuentes = [];
    for (const f of fuentesQuery) {
      const ppto = Number(f.total_ppto || 0);
      const ejec = Number(f.total_ejecucion || 0);
      if (ppto > 0 || ejec > 0) {
        desglose_fuentes.push({
          seccion: f.seccion || 'Desconocido',
          fuente: f.fuente || 'Desconocido',
          total_ppto: ppto,
          total_ejecucion: ejec,
          diferencia: ppto - ejec,
          porcentaje_cumplimiento: calcularPorcentaje(ppto, ejec)
        });
      }
    }

    desglose_fuentes.sort((a, b) => a.porcentaje_cumplimiento - b.porcentaje_cumplimiento);

    res.status(200).json({
      resumen_mensual,
      desglose_fuentes,
      total_anual_ppto,
      total_anual_ejecucion,
      diferencia_anual: total_anual_ppto - total_anual_ejecucion,
      porcentaje_anual: calcularPorcentaje(total_anual_ppto, total_anual_ejecucion)
    });
  });

  importarPresupuesto = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!AppDataSource.isInitialized) {
      res.status(500).json({ message: 'Base de datos no inicializada' });
      return;
    }

    try {
      // Resolve path
      const searchPaths = [
        path.resolve(process.cwd(), 'ppto_2026.xlsx'),
        path.resolve(process.cwd(), 'NOC', 'ppto_2026.xlsx'),
        path.resolve(process.cwd(), 'backend', 'noc', 'ppto_2026.xlsx')
      ];
      
      let foundPath = '';
      for (const p of searchPaths) {
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }

      if (!foundPath) {
        res.status(404).json({ message: 'Archivo ppto_2026.xlsx no encontrado.' });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(foundPath);
      const worksheet = workbook.worksheets[0];

      let data: any[] = sheetToJSON(worksheet);
      let hasFecha = data.some(row => row['Fecha'] !== undefined);
      if (!hasFecha) {
        data = sheetToJSON(worksheet, 2);
        hasFecha = data.some(row => row['Fecha'] !== undefined);
      }

      if (!hasFecha) {
        res.status(400).json({ message: 'El archivo Excel no tiene un formato válido o falta la columna "Fecha".' });
        return;
      }

      const repo = AppDataSource.getRepository(Presupuesto);
      await repo.clear();

      const newRecords = [];
      for (const row of data) {
        if (!row['Fecha']) continue;

        let parsedDate: Date;
        if (row['Fecha'] instanceof Date) {
          parsedDate = row['Fecha'];
        } else if (typeof row['Fecha'] === 'number') {
          parsedDate = new Date((row['Fecha'] - (25567 + 2)) * 86400 * 1000);
        } else {
          parsedDate = new Date(row['Fecha']);
        }

        if (isNaN(parsedDate.getTime())) continue;

        const p = new Presupuesto();
        p.fecha = parsedDate;
        p.seccion = row['Seccion'] || row['Sección'] || '';
        p.fuente = row['Fuente'] || '';
        p.ppto = Number(row['ppto'] || row['Ppto'] || 0.0);
        p.ejecucion = Number(row['Ejecución'] || row['ejecucion'] || row['Ejecucion'] || 0.0);

        newRecords.push(p);
      }

      await repo.save(newRecords);

      res.status(200).json({
        mensaje: `Presupuesto importado exitosamente desde ppto_2026.xlsx (${newRecords.length} registros).`
      });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: `Error al importar excel: ${e.message}` });
    }
  });
}
