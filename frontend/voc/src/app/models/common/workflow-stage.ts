export interface WorkflowStage {
  id: string;
  label: string;
}

export const WORKFLOW_STAGES: WorkflowStage[] = [
  { id: 'quotation', label: 'Cotización' },
  { id: 'create_proposal', label: 'Crear Propuesta' },
  { id: 'get_data', label: 'Obtener Datos' },
  { id: 'validate_proposal', label: 'Validar Propuesta' },
  { id: 'in_sell', label: 'Venta' },
  { id: 'consecutive_generation', label: 'Generación de Consecutivo' },
  { id: 'closed_won', label: 'Cerrado Ganado' },
  { id: 'implementation', label: 'Implementación' },
  { id: 'customer_review', label: 'Revisión del Cliente' },
  { id: 'completed', label: 'Completado' }
];
