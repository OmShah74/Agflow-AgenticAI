import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseNode from '@/components/nodes/BaseNode';

// Using BaseNode structure
export default memo(({ data, selected }: any) => {
    return (
        <BaseNode
            selected={selected}
            title="Data Visualizer"
            icon={BarChart3}
            color="purple"
        >
            <div className="p-3 space-y-3">
                <div className="text-xs text-slate-400">
                    Connects to Model or Agent to generate charts from data.
                </div>

                {/* Inputs */}
                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="dataInput"
                        className="w-2 h-2 !bg-pink-500"
                    />
                    <span className="ml-3 text-xs text-slate-300">Data Source (Optional)</span>
                </div>

                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="modelInput"
                        className="w-2 h-2 !bg-purple-500"
                    />
                    <span className="ml-3 text-xs text-slate-300">Model / Agent (Required)</span>
                </div>

                <div className="h-[1px] bg-slate-800 my-2"></div>

                {/* Outputs */}
                <div className="relative flex items-center justify-end">
                    <span className="mr-3 text-xs text-slate-300">Visualization Output</span>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="output"
                        className="w-2 h-2 !bg-pink-500"
                    />
                </div>
            </div>
        </BaseNode>
    );
});
