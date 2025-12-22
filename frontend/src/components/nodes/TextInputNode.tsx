import { NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function TextInputNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="Text Input" 
        icon={FileText} 
        color="slate"
        data={data}
        id={id}
        selected={selected}
        nodeType="textInput"
    >
        <NodeField label="Value" id="val" inputType="none">
            <Textarea 
                className="text-xs bg-slate-900 border-slate-700 text-slate-300 min-h-[80px] resize-none focus:ring-purple-500" 
                placeholder="Enter text here..."
                value={data.value || ''}
                onChange={(e) => data.onChange && data.onChange(id, { ...data, value: e.target.value })}
            />
        </NodeField>
        
        <NodeField label="Output" id="out" inputType="source" handleColor="slate">
             <div className="text-right text-[10px] text-slate-500">String</div>
        </NodeField>
    </BaseNode>
  );
}