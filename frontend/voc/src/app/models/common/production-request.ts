import { UploadedFile } from './uploaded-file';
import { Status } from './status';
import { CustomerData } from './customer-data';
import { AudienceData } from './audience-data';
import { CampaignDetail } from './campaign-detail';
import { ProductionInfo } from './production-info';
import { MaterialRegister } from './material-register';

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
  customerData?: CustomerData;
  audienceData?: AudienceData;
  campaignDetail?: CampaignDetail;
  productionInfo?: ProductionInfo;
  materialData?: any;
  materialRegisters?: MaterialRegister[];
  consecutive?: number | null;
}