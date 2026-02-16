export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadDate: string;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
}

export interface CustomerData {
  clientAgency: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  businessName: string;
  nit: string;
  serviceStrategy?: boolean;
  serviceTactical?: boolean;
  serviceProduction?: boolean;
  serviceData?: boolean;
}

export interface Gender {
  id: number;
  name: string;
}

export interface AgeRange {
  id: number;
  name: string;
}

export interface SocioeconomicLevel {
  id: number;
  name: string;
}

export interface AudienceData {
  genderId?: number;
  gender?: Gender;
  geo: string;
  ageRangeId?: number;
  ageRange?: AgeRange;
  socioEconomicLevelId?: number;
  socioEconomicLevel?: SocioeconomicLevel;
  interests: string;
  specificDetails: string;
  campaignContext: string;
  campaignConcept?: string;
  assets?: string;
}

export interface Product {
  id: number;
  name: string;
}

export interface CampaignProduct {
  id?: number;
  campaignDetailId?: number;
  productId: number;
  quantity: string;
  product?: Product;
}

export interface Objective {
  id: number;
  name: string;
}

export interface CampaignDetail {
  budget: string;
  brand?: string;
  productService: string;
  objectiveId?: number;
  objective?: Objective;
  campaignProducts?: CampaignProduct[];
}

export interface FormatType {
  id: number;
  name: string;
}

export interface RightsDuration {
  id: number;
  name: string;
}

export interface ProductionInfo {
  formatTypeId?: number;
  formatType?: FormatType;
  rightsDurationId?: number;
  rightsDuration?: RightsDuration;
  rightsTime?: string; // Legacy support
  campaignEmissionDate?: string;
  communicationTone: string;
  ownAndExternalMedia: string;
  tvFormats?: string;
  digitalFormats?: string;
  productionDetails: string;
  additionalComments?: string;
}

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

export interface Status {
  id: number;
  name: string;
  code: string;
  order: number;
}

export interface ProductionRequest {
  id: number;
  name: string;
  requestDate: string;
  department: string;
  userCreatorId?: number;
  assignedUserId?: number;
  deliveryDate?: string;
  observations?: string;
  stage: string;
  statusId?: number;
  status?: Status | string;
  files?: UploadedFile[];

  // New stepper data
  customerData?: CustomerData;
  audienceData?: AudienceData;
  campaignDetail?: CampaignDetail;
  productionInfo?: ProductionInfo;
}

export const WORKFLOW_STAGES = [
  { id: 'request', label: 'Inicio' },
  { id: 'quotation', label: 'Cotización' },
  { id: 'create_proposal', label: 'Crear Propuesta' },
  { id: 'get_data', label: 'Obtener Datos' },
  { id: 'in_sell', label: 'Venta' },
  { id: 'val_materiales_mobile', label: 'Val. Materiales Mobile' },
  { id: 'val_materiales_programatica', label: 'Val. Materiales Programática' },
  { id: 'val_materiales_red_plus', label: 'Val. Materiales Red+' },
  { id: 'gestion_operativa', label: 'Gestión Operativa' },
  { id: 'cierre', label: 'Cierre' },
  { id: 'completed', label: 'Completado' } // Keep for backward compatibility if needed
];
