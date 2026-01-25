import { AppDataSource } from '../config/typeorm.config';
import { ProductionRequestHistory } from '../models/ProductionRequestHistory';
import { ProductionRequest } from '../models/ProductionRequest';
import { Repository } from 'typeorm';

export class ProductionRequestHistoryService {
  private historyRepository: Repository<ProductionRequestHistory>;

  constructor() {
    this.historyRepository = AppDataSource.getRepository(ProductionRequestHistory);
  }

  /**
   * Log a change in the production request history
   */
  async logChange(
    productionRequestId: number,
    changeField: string,
    oldValue: any,
    newValue: any,
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

  /**
   * Get history for a specific production request
   */
  async getHistoryByRequestId(requestId: number): Promise<ProductionRequestHistory[]> {
    return await this.historyRepository.find({
      where: { productionRequestId: requestId },
      relations: ['changedByUser'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Compare two objects and log differences
   */
  async logDifferences(
    oldRequest: ProductionRequest,
    newRequest: Partial<ProductionRequest>,
    changedBy: number
  ): Promise<void> {
    const fieldsToCheck: (keyof ProductionRequest)[] = [
      'name', 'department', 'contactPerson',
      'assignedUserId', 'deliveryDate', 'observations', 'statusId'
    ];

    for (const field of fieldsToCheck) {
      // Skip if field is not in newRequest
      if (newRequest[field] === undefined) continue;

      const oldVal = oldRequest[field];
      const newVal = newRequest[field];

      // Simple comparison (needs improvement for dates and objects)
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

  private isDifferent(val1: any, val2: any): boolean {
    if (val1 instanceof Date && val2 instanceof Date) {
      return val1.getTime() !== val2.getTime();
    }
    if (val1 instanceof Date && typeof val2 === 'string') {
      return val1.getTime() !== new Date(val2).getTime();
    }
    // Handle null/undefined equality
    if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
      return false;
    }
    return val1 != val2;
  }
}
