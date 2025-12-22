import { NodeProps } from '@xyflow/react';
import { FileText, Braces } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import { NodeCard, NodeHeader, NodeField } from './NodeComponents';

export default function PromptTemplateNode({ data, id, selected }: NodeProps<any>) {
  return (
    <NodeCard selected={selected}>
      <NodeHeader icon={Braces} title="Prompt Template" color="purple" badge="String" />
      
      <NodeField label="Template String" id="template" inputType="none">
        <Textarea 
           className="text-xs bg-slate-900 border-slate-700 min-h-[100px] font-mono text-purple-200"
           placeholder="You are a {role}. Answer: {question}"
           value={data.template}
           onChange={(e) => data.onChange(id, { ...data, template: e.target.value })}
        />
      </NodeField>

      <NodeField label="Variables Input" id="vars" inputType="target" handleColor="purple">
         <div className="text-[10px] text-slate-500 italic">Connect variables here</div>
      </NodeField>

      <NodeField label="Formatted Prompt" id="prompt" inputType="source" handleColor="purple">
         <div className="p-2 bg-slate-900 rounded border border-slate-800 text-xs text-slate-400">
            Output String
         </div>
      </NodeField>
    </NodeCard>
  );
}