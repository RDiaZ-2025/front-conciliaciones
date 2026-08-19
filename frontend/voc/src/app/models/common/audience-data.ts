import { Gender } from './gender';
import { AgeRange } from './age-range';
import { SocioeconomicLevel } from './socioeconomic-level';

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