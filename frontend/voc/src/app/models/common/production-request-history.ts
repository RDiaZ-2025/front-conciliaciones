export interface ProductionRequestHistory {
  id: number;
  productionRequestId: number;
  changeField: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: number;
  changeType: 'create' | 'update' | 'delete' | 'status_change';
  createdAt: string;
  changedByUser?: {
    id: number;
    name: string;
    email: string;
  };
}