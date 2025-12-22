import { NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function ChatInputNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="Chat Input" 
        icon={MessageSquare} 
        color="blue"
        data={data}
        id={id}
        selected={selected}
        nodeType="chatInput"
    >
      <div className="p-3 bg-slate-900/50 rounded border border-slate-800 border-dashed mb-2">
        <p className="text-[10px] text-slate-400 text-center italic">
            "User Message"
        </p>
        <p className="text-[10px] text-slate-500 text-center mt-1">
            Accepts text from the playground chat window.
        </p>
      </div>
      <NodeField label="Message Output" id="out" inputType="source" handleColor="blue">
         <div className="text-right text-[10px] text-slate-500">String</div>
      </NodeField>
    </BaseNode>
  );
}