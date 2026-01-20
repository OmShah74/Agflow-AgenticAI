import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { BarChart3, Key, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseNode from '@/components/nodes/BaseNode';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label"; // Missing

// Using BaseNode structure
export default memo(({ id, data, selected }: any) => {
    const { updateNodeData } = useReactFlow();

    return (
        <BaseNode
            selected={selected}
            title="Data Visualizer"
            icon={BarChart3}
            color="purple"
        >
            <div className="p-3 space-y-4 w-64">
                <div className="text-xs text-slate-400">
                    Generates charts from data. Connect a model or configure below.
                </div>

                {/* Internal Configuration */}
                <div className="space-y-3 bg-slate-900/50 p-2 rounded border border-slate-800">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                        <Settings2 size={12} />
                        <span>Configuration</span>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">Model Provider</label>
                        <Select onValueChange={(v) => updateNodeData(id, { model: v })} defaultValue={data.model || "gpt-4o"}>
                            <SelectTrigger className="h-7 text-xs bg-slate-950 border-slate-700">
                                <SelectValue placeholder="Select Model" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-950 border-slate-700">
                                <SelectItem value="gpt-4o">OpenAI GPT-4o</SelectItem>
                                <SelectItem value="gpt-4-turbo">OpenAI GPT-4 Turbo</SelectItem>
                                <SelectItem value="llama-3.3-70b-versatile">Groq Llama 3.3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 font-medium">API Key (Optional)</label>
                        <div className="relative">
                            <Key className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                            <Input
                                type="password"
                                className="h-7 pl-7 text-xs bg-slate-950 border-slate-700 placeholder:text-slate-700"
                                placeholder="Env var used if empty"
                                value={data.apiKey || ''}
                                onChange={(e) => updateNodeData(id, { apiKey: e.target.value })}
                            />
                        </div>
                    </div>
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
                    <span className="ml-3 text-xs text-slate-300">Model Override (Optional)</span>
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
