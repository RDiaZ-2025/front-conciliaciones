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