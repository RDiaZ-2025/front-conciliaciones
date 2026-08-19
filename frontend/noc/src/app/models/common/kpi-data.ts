export interface KpiData {
  label: string;
  value: string | number;
  variation?: number;
  variationType?: 'pp' | 'percentage';
  comparisonPeriod?: string;
  isActive?: boolean;
  color?: 'red' | 'slate' | 'emerald' | 'pink' | 'amber';
}
