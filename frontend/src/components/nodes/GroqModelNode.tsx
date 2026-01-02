import { NodeProps } from '@xyflow/react';
import { Cpu, Key, MessageSquare } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function GroqModelNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="Groq Model" 
        icon={Cpu} 
        color="green" 
        data={data} 
        id={id} 
        selected={selected} 
        nodeType="groqModel"
    >
      <div className="flex flex-col gap-0">
          {/* --- NEW: Dedicated Prompt Input Handle --- */}
          <NodeField label="Prompt / Input" id="prompt" inputType="target" handleColor="blue">
             <div className="flex items-center gap-2 text-[10px] text-slate-500 italic bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <MessageSquare size={12} />
                <span>Connect Chat Input</span>
             </div>
          </NodeField>

          {/* Model Name Selector */}
          <NodeField label="Model Name" id="model" inputType="none">
             <Select onValueChange={(v) => data.onChange(id, { ...data, model: v })} defaultValue={data.model || "llama-3.3-70b-versatile"}>
                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300 focus:ring-green-500/20">
                    <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                    <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                    <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                    <SelectItem value="gemma-7b-it">Gemma 7B</SelectItem>
                </SelectContent>
             </Select>
          </NodeField>

          {/* API Key (Input Box ONLY, No Handle) */}
          <NodeField label="API Key" id="apikey" inputType="none">
            <div className="relative">
                <Key className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                <Input 
                    type="password" 
                    className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-green-500 transition-colors" 
                    placeholder="gsk_..."
                    value={data.apiKey || ''}
                    onChange={(e) => data.onChange(id, { ...data, apiKey: e.target.value })}
                />
            </div>
          </NodeField>

          {/* Model Output Handle */}
          <NodeField label="Model Output" id="out" inputType="source" handleColor="green">
             <div className="text-right text-[10px] text-slate-500">LLM Instance</div>
          </NodeField>
      </div>
    </BaseNode>
  );
}