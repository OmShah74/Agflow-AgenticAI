import { NodeProps } from '@xyflow/react';
import { Cpu } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import BaseNode from './BaseNode'; // Use BaseNode, NOT NodeCard directly
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
      <NodeField label="Model Name" id="model" inputType="none">
         <Select onValueChange={(v) => data.onChange(id, { ...data, model: v })} defaultValue={data.model || "llama-3.3-70b-versatile"}>
            <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300">
                <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-slate-300">
                <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B</SelectItem>
                <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                <SelectItem value="gemma-7b-it">Gemma 7B</SelectItem>
            </SelectContent>
         </Select>
      </NodeField>

      <NodeField label="API Key" id="apikey" inputType="target" handleColor="green">
        <Input 
            type="password" 
            className="h-8 text-xs bg-slate-900 border-slate-700" 
            placeholder="gsk_..."
            value={data.apiKey || ''}
            onChange={(e) => data.onChange(id, { ...data, apiKey: e.target.value })}
        />
      </NodeField>

      <NodeField label="Model Output" id="out" inputType="source" handleColor="green">
         <div className="text-right text-[10px] text-slate-500">LLM Instance</div>
      </NodeField>
    </BaseNode>
  );
}