import { Product } from './product';

export interface CampaignProduct {
  id?: number;
  campaignDetailId?: number;
  productId: number;
  quantity: string;
  product?: Product;
}