export interface DataPoint {
    [key: string]: string | number;
}

export interface Dataset {
    name: string;
    data: DataPoint[];
    columns: string[];
}

export interface ChartConfig {
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'doughnut';
    title: string;
    description?: string;
    xAxis?: string;
    yAxis?: string;
    dataKeys?: string[];
    colors?: string[];
}

export interface VisualizationData {
    id: string;
    config: ChartConfig;
    data: any;
    timestamp: Date;
}
