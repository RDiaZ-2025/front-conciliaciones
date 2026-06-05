export interface KpiData {
    label: string;
    value: string | number;
    variation?: number;
    variationType?: 'pp' | 'percentage';
    comparisonPeriod?: string;
    isActive?: boolean;
    color?: 'indigo' | 'slate' | 'emerald' | 'pink' | 'amber';
}

export interface DashboardHighlight {
    title: string;
    value: string;
    type: 'section' | 'topic' | 'author';
    tag: string;
}
