'use client';

import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Pie, Scatter, Radar, Doughnut } from 'react-chartjs-2';
import { Dataset, ChartConfig } from '@/types/visualization';
import { generateColorPalette, getNumericColumns, getCategoricalColumns } from '@/lib/visualization-utils';
import ChartCard from './ChartCard';
import { TrendingUp, BarChart3 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface VisualizationDashboardProps {
    dataset: Dataset | null;
    suggestedCharts?: ChartConfig[];
    isLoading?: boolean;
}

export default function VisualizationDashboard({ dataset, suggestedCharts, isLoading }: VisualizationDashboardProps) {
    const [charts, setCharts] = useState<ChartConfig[]>([]);

    useEffect(() => {
        if (suggestedCharts && suggestedCharts.length > 0) {
            setCharts(suggestedCharts);
        } else if (dataset && dataset.data.length > 0) {
            generateDefaultCharts();
        }
    }, [dataset, suggestedCharts]);

    const generateDefaultCharts = () => {
        if (!dataset) return;
        // Fallback heuristic if no AI suggestions are provided
        const numericCols = getNumericColumns(dataset).filter(col => !/id|key|index/i.test(col));
        const categoricalCols = getCategoricalColumns(dataset).filter(col => !/id|key|index/i.test(col));
        const newCharts: ChartConfig[] = [];

        // Chart 1: Bar chart of first numeric column by first categorical column
        if (numericCols.length > 0 && categoricalCols.length > 0) {
            newCharts.push({
                type: 'bar',
                title: `${numericCols[0]} by ${categoricalCols[0]}`,
                description: 'Distribution across categories',
                xAxis: categoricalCols[0],
                yAxis: numericCols[0],
            });
        }

        // Chart 2: Line chart showing trends
        if (numericCols.length >= 2) {
            // Check if one looks like a time/sequence
            newCharts.push({
                type: 'line',
                title: `${numericCols[0]} vs ${numericCols[1]}`,
                description: 'Trend analysis',
                dataKeys: [numericCols[0], numericCols[1]], // Just a placeholder logic
                xAxis: numericCols[0],
                yAxis: numericCols[1]
            });
        }

        setCharts(newCharts);
    };

    // Helper for robust key lookup
    const getValue = (row: any, key: string) => {
        if (row[key] !== undefined) return row[key];
        // Case-insensitive fallback
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);
        return foundKey ? row[foundKey] : undefined;
    };

    const prepareChartData = (config: ChartConfig) => {
        if (!dataset) return null;

        const colors = generateColorPalette(12);

        switch (config.type) {
            case 'bar':
            case 'line': {
                const xAxis = config.xAxis || dataset.columns[0];
                const activeDataKeys = config.dataKeys && config.dataKeys.length > 0
                    ? config.dataKeys
                    : [config.yAxis || getNumericColumns(dataset)[0]];

                if (!xAxis || activeDataKeys.length === 0 || !activeDataKeys[0]) return null;

                const labels = dataset.data.map(d => String(getValue(d, xAxis)));

                const datasets = activeDataKeys.map((key, i) => {
                    const values = dataset.data.map(d => Number(getValue(d, key)) || 0);
                    const color = colors[i % colors.length];
                    return {
                        label: key,
                        data: values,
                        backgroundColor: config.type === 'bar' ? color + '80' : color + '20',
                        borderColor: color,
                        borderWidth: 2,
                        fill: config.type === 'line',
                        tension: 0.4,
                    };
                });

                return {
                    labels,
                    datasets,
                };
            }

            case 'pie':
            case 'doughnut': {
                const xAxis = config.xAxis || dataset.columns[0];
                const yAxis = config.yAxis;

                if (!xAxis) return null;

                const aggregation: { [key: string]: number } = {};
                dataset.data.forEach(d => {
                    const rowVal = getValue(d, xAxis);
                    const category = rowVal !== undefined ? String(rowVal) : 'Unknown';
                    const rawVal = yAxis ? getValue(d, yAxis) : 1;
                    const value = Number(rawVal) || (yAxis ? 0 : 1);
                    aggregation[category] = (aggregation[category] || 0) + value;
                });

                const labels = Object.keys(aggregation);
                const values = Object.values(aggregation);
                if (labels.length === 0) return null;

                return {
                    labels,
                    datasets: [
                        {
                            data: values,
                            backgroundColor: colors.slice(0, Math.min(labels.length, colors.length)),
                            borderColor: '#0f172a',
                            borderWidth: 2,
                        },
                    ],
                };
            }

            case 'scatter': {
                const xAxis = config.xAxis || getNumericColumns(dataset)[0];
                const yAxis = config.yAxis || getNumericColumns(dataset)[1];
                if (!xAxis || !yAxis) return null;

                const points = dataset.data.map(d => ({
                    x: Number(getValue(d, xAxis)) || 0,
                    y: Number(getValue(d, yAxis)) || 0,
                }));

                return {
                    datasets: [
                        {
                            label: `${xAxis} vs ${yAxis}`,
                            data: points,
                            backgroundColor: colors[0] + '80',
                            borderColor: colors[0],
                            borderWidth: 2,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                        },
                    ],
                };
            }

            case 'radar': {
                const xAxis = config.xAxis || dataset.columns[0];
                const activeDataKeys = config.dataKeys && config.dataKeys.length > 0
                    ? config.dataKeys
                    : [config.yAxis || getNumericColumns(dataset)[0]];

                if (!xAxis || activeDataKeys.length === 0) return null;

                const labels = dataset.data.slice(0, 10).map(d => String(getValue(d, xAxis)));

                const datasets = activeDataKeys.map((key, i) => {
                    const values = dataset.data.slice(0, 10).map(d => Number(getValue(d, key)) || 0);
                    const color = colors[i % colors.length];
                    return {
                        label: key,
                        data: values,
                        backgroundColor: color + '40',
                        borderColor: color,
                        borderWidth: 2,
                        pointBackgroundColor: color,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: color,
                    };
                });

                return {
                    labels,
                    datasets,
                };
            }

            default:
                return null;
        }
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                labels: {
                    color: '#cbd5e1',
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
                borderColor: '#0ea5e9',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
            },
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)',
                },
                ticks: {
                    color: '#94a3b8',
                    font: {
                        size: 11,
                    },
                },
            },
        },
    };

    const renderChart = (config: ChartConfig) => {
        const data = prepareChartData(config);
        if (!data) return <div className="text-slate-500 text-sm">Could not render chart</div>;

        const commonProps = { data: data as any, options: chartOptions };

        switch (config.type) {
            case 'bar':
                return <Bar {...commonProps} />;
            case 'line':
                return <Line {...commonProps} />;
            case 'pie':
                return <Pie {...commonProps} />;
            case 'doughnut':
                return <Doughnut {...commonProps} />;
            case 'scatter':
                return <Scatter {...commonProps} />;
            case 'radar':
                return <Radar {...commonProps} />;
            default:
                return null;
        }
    };

    if (!dataset) {
        return (
            <div className="bg-slate-900/30 p-12 rounded-2xl flex items-center justify-center border border-slate-800 border-dashed">
                <div className="text-center text-slate-500">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-bold mb-2">No Data Loaded</h3>
                    <p className="text-sm">
                        Upload a dataset to see beautiful visualizations
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full">
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-purple-500" />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">Data Insights</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {dataset.name} • {dataset.data.length} rows • {dataset.columns.length} columns
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wider">Total Rows</p>
                        <p className="text-2xl font-bold text-purple-400 mt-1">
                            {dataset.data.length.toLocaleString()}
                        </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wider">Columns</p>
                        <p className="text-2xl font-bold text-blue-400 mt-1">
                            {dataset.columns.length}
                        </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wider">Numeric</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">
                            {getNumericColumns(dataset).length}
                        </p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                        <p className="text-slate-400 text-xs uppercase tracking-wider">Categorical</p>
                        <p className="text-2xl font-bold text-orange-400 mt-1">
                            {getCategoricalColumns(dataset).length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.map((config, index) => (
                    <ChartCard key={index} config={config}>
                        {renderChart(config)}
                    </ChartCard>
                ))}
            </div>
        </div>
    );
}
