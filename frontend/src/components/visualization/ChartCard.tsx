'use client';

import { ChartConfig } from '@/types/visualization';
import { BarChart3, LineChart, PieChart, ScatterChart, Radar, Download } from 'lucide-react';

interface ChartCardProps {
    config: ChartConfig;
    children: React.ReactNode;
}

export default function ChartCard({ config, children }: ChartCardProps) {
    const getIcon = () => {
        switch (config.type) {
            case 'bar':
                return <BarChart3 className="w-5 h-5" />;
            case 'line':
                return <LineChart className="w-5 h-5" />;
            case 'pie':
            case 'doughnut':
                return <PieChart className="w-5 h-5" />;
            case 'scatter':
                return <ScatterChart className="w-5 h-5" />;
            case 'radar':
                return <Radar className="w-5 h-5" />;
            default:
                return <BarChart3 className="w-5 h-5" />;
        }
    };

    return (
        <div className="bg-slate-900/40 border border-slate-700 p-6 rounded-2xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                        {getIcon()}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-100">{config.title}</h3>
                        {config.description && (
                            <p className="text-sm text-slate-400 mt-1">{config.description}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => {
                        // TODO: Implement download functionality
                        console.log('Download chart:', config.title);
                    }}
                    className="p-2 hover:bg-slate-700/50 rounded-lg transition-all"
                    title="Download chart"
                >
                    <Download className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-4 min-h-[300px] flex items-center justify-center">
                {children}
            </div>
        </div>
    );
}
