import { FormatType } from './format-type';
import { RightsDuration } from './rights-duration';

export interface ProductionInfo {
  formatTypeId?: number;
  formatType?: FormatType;
  rightsDurationId?: number;
  rightsDuration?: RightsDuration;
  rightsTime?: string;
  campaignEmissionDate?: string;
  communicationTone: string;
  ownAndExternalMedia: string;
  tvFormats?: string;
  digitalFormats?: string;
  productionDetails: string;
  additionalComments?: string;
}