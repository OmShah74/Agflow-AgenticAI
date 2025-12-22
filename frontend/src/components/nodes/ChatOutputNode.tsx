import { NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function ChatOutputNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="Chat Output" 
        icon={MessageSquare} 
        color="blue"
        data={data}
        id={id}
        selected={selected}
        nodeType="chatOutput"
    >
      <NodeField label="Result Input" id="in" inputType="target" handleColor="blue">
         <div className="text-[10px] text-slate-500">Connect Agent/Text here</div>
      </NodeField>
      
      <div className="p-3 bg-slate-900/50 rounded border border-slate-800 border-dashed min-h-[40px] flex items-center justify-center">
        <p className="text-[10px] text-slate-500 italic">
            Final Response Display
        </p>
      </div>
    </BaseNode>
  );
}