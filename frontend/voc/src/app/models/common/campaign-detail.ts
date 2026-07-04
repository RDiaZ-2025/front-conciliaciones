import { Objective } from './objective';
import { CampaignProduct } from './campaign-product';

export interface CampaignDetail {
  budget: string;
  brand?: string;
  productService: string;
  objectiveId?: number;
  objective?: Objective;
  campaignProducts?: CampaignProduct[];
}