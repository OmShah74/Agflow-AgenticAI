import { NodeProps } from '@xyflow/react';
import { Cpu, Key, MessageSquare } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function OpenAIModelNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="OpenAI Model" 
        icon={Cpu} 
        color="green" // Changed to Green to match Agent's Model Input
        data={data} 
        id={id} 
        selected={selected} 
        nodeType="openaiModel"
    >
      <div className="flex flex-col gap-0">
          {/* Prompt Input Handle */}
          <NodeField label="Prompt / Input" id="prompt" inputType="target" handleColor="blue">
             <div className="flex items-center gap-2 text-[10px] text-slate-500 italic bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <MessageSquare size={12} />
                <span>Connect Chat Input</span>
             </div>
          </NodeField>

          {/* Model Name Selector */}
          <NodeField label="Model Name" id="model" inputType="none">
             <Select 
                onValueChange={(v) => data.onChange(id, { ...data, model: v })} 
                defaultValue={data.model || "gpt-4o"}
             >
                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300 focus:ring-green-500/20">
                    <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
             </Select>
          </NodeField>

          {/* API Key Input */}
          <NodeField label="OpenAI API Key" id="apikey" inputType="none">
            <div className="relative">
                <Key className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                <Input 
                    type="password" 
                    className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-green-500 transition-colors" 
                    placeholder="sk-..."
                    // FIX: Ensure value is never undefined to prevent console errors
                    value={data.apiKey || ''}
                    onChange={(e) => data.onChange(id, { ...data, apiKey: e.target.value })}
                />
            </div>
          </NodeField>

          {/* Output Handle */}
          <NodeField label="Model Output" id="out" inputType="source" handleColor="green">
             <div className="text-right text-[10px] text-slate-500">LLM Instance</div>
          </NodeField>
      </div>
    </BaseNode>
  );
}