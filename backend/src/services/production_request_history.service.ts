import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequestHistory } from '../models/ProductionRequestHistory';
import { ProductionRequest } from '../models/ProductionRequest';
import { Repository } from 'typeorm';

export class ProductionRequestHistoryService {
  private historyRepository: Repository<ProductionRequestHistory>;

  constructor() {
    this.historyRepository = AppDataSource.getRepository(ProductionRequestHistory);
  }

  async logChange(
    productionRequestId: number,
    changeField: string,
    oldValue: unknown,
    newValue: unknown,
    changedBy: number,
    changeType: 'create' | 'update' | 'delete' | 'status_change'
  ): Promise<ProductionRequestHistory> {
    const history = new ProductionRequestHistory();
    history.productionRequestId = productionRequestId;
    history.changeField = changeField;
    history.oldValue = oldValue ? String(oldValue) : null;
    history.newValue = newValue ? String(newValue) : null;
    history.changedBy = changedBy;
    history.changeType = changeType;

    return await this.historyRepository.save(history);
  }

  async getHistoryByRequestId(requestId: number): Promise<ProductionRequestHistory[]> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Base de datos no disponible');
    }

    return await this.historyRepository.find({
      where: { productionRequestId: requestId },
      relations: ['changedByUser'],
      order: { createdAt: 'DESC' }
    });
  }

  async logDifferences(
    oldRequest: ProductionRequest,
    newRequest: Partial<ProductionRequest>,
    changedBy: number
  ): Promise<void> {
    const fieldsToCheck: (keyof ProductionRequest)[] = [
      'name', 'department',
      'assignedUserId', 'deliveryDate', 'observations', 'status'
    ];

    for (const field of fieldsToCheck) {

      if (newRequest[field] === undefined) continue;

      const oldVal = oldRequest[field];
      const newVal = newRequest[field];

      if (this.isDifferent(oldVal, newVal)) {
        await this.logChange(
          oldRequest.id,
          field,
          oldVal,
          newVal,
          changedBy,
          'update'
        );
      }
    }
  }

  private isDifferent(val1: unknown, val2: unknown): boolean {
    if (val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() !== val2.getTime();
    }
    if (val1 instanceof Date && typeof val2 === 'string') {
      return val1.getTime() !== new Date(val2).getTime();
    }

    if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
      return false;
    }
    return val1 != val2;
  }
}
