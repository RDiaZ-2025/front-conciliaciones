import { AppDataSource } from '../config/typeorm.config';
import { Customer } from '../models/Customer';
import { Like } from 'typeorm';
import * as ExcelJS from 'exceljs';

export class CustomerService {
  private getRepository() {
    return AppDataSource.getRepository(Customer);
  }

  async getCustomers(params: {
    search?: string;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }): Promise<{ data: Customer[]; total: number }> {
    const repository = this.getRepository();
    const search = params.search?.trim();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const includeInactive = params.includeInactive ?? false;

    const query = repository.createQueryBuilder('customer');

    if (!includeInactive) {
      query.andWhere('customer.isActive = :isActive', { isActive: 1 });
    }

    if (search) {
      query.andWhere(
        '(customer.documentNumber LIKE :search OR customer.businessName LIKE :search OR customer.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    query
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total };
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    return await this.getRepository().findOne({ where: { id } });
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const repository = this.getRepository();

    const docType = data.documentType?.trim();
    const docNum = data.documentNumber?.trim();
    if (!docType || !docNum) {
      throw new Error('Tipo y número de documento son obligatorios');
    }

    const existing = await repository.findOne({
      where: { documentType: docType, documentNumber: docNum }
    });

    if (existing) {
      if (existing.isActive) {
        throw new Error(`Ya existe un cliente activo con el tipo de documento ${docType} y número ${docNum}`);
      } else {

        Object.assign(existing, {
          ...data,
          isActive: true
        });
        return await repository.save(existing);
      }
    }

    const customer = repository.create({
      ...data,
      documentType: docType,
      documentNumber: docNum,
      isActive: true
    });
    return await repository.save(customer);
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | null> {
    const repository = this.getRepository();
    const customer = await this.getCustomerById(id);
    if (!customer) return null;

    if (
      (data.documentType && data.documentType !== customer.documentType) ||
      (data.documentNumber && data.documentNumber !== customer.documentNumber)
    ) {
      const docType = data.documentType || customer.documentType;
      const docNum = data.documentNumber || customer.documentNumber;
      const existing = await repository.findOne({
        where: { documentType: docType, documentNumber: docNum }
      });
      if (existing && existing.id !== id) {
        throw new Error(`Ya existe otro cliente con el tipo de documento ${docType} y número ${docNum}`);
      }
    }

    Object.assign(customer, data);
    return await repository.save(customer);
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const repository = this.getRepository();
    const customer = await this.getCustomerById(id);
    if (!customer) return false;

    customer.isActive = false;
    await repository.save(customer);
    return true;
  }

  async bulkUpload(
    fileBuffer: Buffer,
    fileName: string
  ): Promise<{ processed: number; created: number; updated: number; errors: { row: number; error: string }[] }> {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: [] as { row: number; error: string }[]
    };

    const rowsData: any[] = [];
    const isCsv = fileName.toLowerCase().endsWith('.csv');

    if (isCsv) {
      const text = fileBuffer.toString('utf-8');
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        throw new Error('El archivo CSV está vacío o solo contiene encabezados');
      }

      const cleanFirstLine = lines[0].replace(/^\uFEFF/, '');

      const separator = cleanFirstLine.includes(';') ? ';' : ',';
      const headers = cleanFirstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

      const expectedHeaders = ['tipodedocumento', 'numerodedocumento', 'razonsocial', 'correoelectronico', 'numerocelular'];
      const missing = expectedHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        throw new Error(`Cabeceras CSV faltantes: ${missing.join(', ')}`);
      }

      const idxDocType = headers.indexOf('tipodedocumento');
      const idxDocNum = headers.indexOf('numerodedocumento');
      const idxBusinessName = headers.indexOf('razonsocial');
      const idxEmail = headers.indexOf('correoelectronico');
      const idxPhone = headers.indexOf('numerocelular');

      const separatorRegex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const rowValues = line.split(separatorRegex).map(v => v.trim().replace(/^"|"$/g, ''));
        if (rowValues.length < headers.length) {
          results.errors.push({ row: i + 1, error: 'Fila incompleta' });
          continue;
        }

        rowsData.push({
          rowNum: i + 1,
          documentType: rowValues[idxDocType],
          documentNumber: rowValues[idxDocNum],
          businessName: rowValues[idxBusinessName] || null,
          email: rowValues[idxEmail],
          phoneNumber: rowValues[idxPhone] || null
        });
      }
    } else {

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as any);
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No se encontró ninguna hoja en el archivo Excel');
      }

      let headers: string[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {

          row.eachCell((cell) => {
            headers.push(String(cell.value || '').trim().toLowerCase());
          });

          const expectedHeaders = ['tipodedocumento', 'numerodedocumento', 'razonsocial', 'correoelectronico', 'numerocelular'];
          const missing = expectedHeaders.filter(h => !headers.includes(h));
          if (missing.length > 0) {
            throw new Error(`Cabeceras Excel faltantes: ${missing.join(', ')}`);
          }
        } else {
          const docType = this.getExcelCellValue(row.getCell(headers.indexOf('tipodedocumento') + 1));
          const docNum = this.getExcelCellValue(row.getCell(headers.indexOf('numerodedocumento') + 1));
          const businessName = this.getExcelCellValue(row.getCell(headers.indexOf('razonsocial') + 1));
          const email = this.getExcelCellValue(row.getCell(headers.indexOf('correoelectronico') + 1));
          const phoneNumber = this.getExcelCellValue(row.getCell(headers.indexOf('numerocelular') + 1));

          rowsData.push({
            rowNum: rowNumber,
            documentType: docType,
            documentNumber: docNum,
            businessName: businessName || null,
            email: email,
            phoneNumber: phoneNumber || null
          });
        }
      });
    }

    const validationErrors: { row: number; error: string }[] = [];
    const fileSeenKeys = new Set<string>();
    const phoneRegex = /^[0-9\s+\-+()]+$/;

    for (const row of rowsData) {
      const docType = row.documentType?.trim();
      const docNum = row.documentNumber?.trim();
      const businessName = row.businessName?.trim();
      const email = row.email?.trim();
      const phone = row.phoneNumber?.trim();

      if (!docType) {
        validationErrors.push({ row: row.rowNum, error: 'El tipo de documento es obligatorio' });
        continue;
      }
      if (!docNum) {
        validationErrors.push({ row: row.rowNum, error: 'El número de documento es obligatorio' });
        continue;
      }
      if (!email) {
        validationErrors.push({ row: row.rowNum, error: 'El correo electrónico es obligatorio' });
        continue;
      }

      if (docType.length > 50) {
        validationErrors.push({ row: row.rowNum, error: `El tipo de documento supera los 50 caracteres permitidos (longitud: ${docType.length})` });
      }
      if (docNum.length > 50) {
        validationErrors.push({ row: row.rowNum, error: `El número de documento supera los 50 caracteres permitidos (longitud: ${docNum.length})` });
      }
      if (businessName && businessName.length > 255) {
        validationErrors.push({ row: row.rowNum, error: `La razón social supera los 255 caracteres permitidos (longitud: ${businessName.length})` });
      }
      if (email.length > 255) {
        validationErrors.push({ row: row.rowNum, error: `El correo electrónico supera los 255 caracteres permitidos (longitud: ${email.length})` });
      }
      if (phone && phone.length > 50) {
        validationErrors.push({ row: row.rowNum, error: `El número de celular supera los 50 caracteres permitidos (longitud: ${phone.length})` });
      }

      if (!this.isValidEmail(email)) {
        validationErrors.push({ row: row.rowNum, error: `Formato de correo electrónico inválido: "${email}"` });
      }
      if (phone && !phoneRegex.test(phone)) {
        validationErrors.push({ row: row.rowNum, error: `El número celular solo debe contener números, espacios y caracteres especiales (+, -, paréntesis) (valor: "${phone}")` });
      }

      const rowKey = `${docType.toLowerCase()}_${docNum.toLowerCase()}`;
      if (fileSeenKeys.has(rowKey)) {
        validationErrors.push({ row: row.rowNum, error: `Número de identificación duplicado dentro de este archivo para: ${docType} ${docNum}` });
      } else {
        fileSeenKeys.add(rowKey);
      }
    }

    if (validationErrors.length > 0) {
      return {
        processed: 0,
        created: 0,
        updated: 0,
        errors: validationErrors,
        ...({ validationFailed: true } as any)
      };
    }

    const repository = this.getRepository();

    const allExisting = await repository.find({
      select: ['id', 'documentType', 'documentNumber']
    });

    const existingLookup = new Map<string, number>();
    for (const ext of allExisting) {
      const lookupKey = `${ext.documentType.trim().toLowerCase()}_${ext.documentNumber.trim().toLowerCase()}`;
      existingLookup.set(lookupKey, ext.id);
    }

    const toSave: Customer[] = [];
    const processedKeys = new Set<string>();

    for (const row of rowsData) {
      results.processed++;

      const docType = row.documentType.trim();
      const docNum = row.documentNumber.trim();
      const email = row.email.trim();

      const rowKey = `${docType.toLowerCase()}_${docNum.toLowerCase()}`;
      if (processedKeys.has(rowKey)) {
        continue;
      }
      processedKeys.add(rowKey);

      const existingId = existingLookup.get(rowKey);
      if (existingId) {

        const cust = new Customer();
        cust.id = existingId;
        cust.documentType = docType;
        cust.documentNumber = docNum;
        cust.businessName = row.businessName;
        cust.email = email;
        cust.phoneNumber = row.phoneNumber;
        cust.isActive = true;
        toSave.push(cust);
        results.updated++;
      } else {

        const cust = new Customer();
        cust.documentType = docType;
        cust.documentNumber = docNum;
        cust.businessName = row.businessName;
        cust.email = email;
        cust.phoneNumber = row.phoneNumber;
        cust.isActive = true;
        toSave.push(cust);
        results.created++;
      }
    }

    if (toSave.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < toSave.length; i += chunkSize) {
        try {
          const chunk = toSave.slice(i, i + chunkSize);
          await repository.save(chunk);
        } catch (err: any) {
          results.errors.push({
            row: i + 2,
            error: `Error al guardar lote de registros: ${err.message || 'Error en la base de datos'}`
          });
        }
      }
    }

    return results;
  }

  private getExcelCellValue(cell: ExcelJS.Cell): string {
    if (!cell || cell.value === null || cell.value === undefined) return '';
    if (typeof cell.value === 'object') {
      const valObj = cell.value as any;
      if (valObj.result !== undefined) return String(valObj.result);
      if (valObj.richText !== undefined && Array.isArray(valObj.richText)) {
        return valObj.richText.map((t: any) => t.text || '').join('');
      }
      return '';
    }
    return String(cell.value).trim();
  }

  private isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

export const customerService = new CustomerService();
