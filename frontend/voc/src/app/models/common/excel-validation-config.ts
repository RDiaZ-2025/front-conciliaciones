import { RequiredCell } from './required-cell';

export interface ExcelValidationConfig {
  requiredSheet: string;
  requiredCells: RequiredCell[];
}