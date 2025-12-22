import { NodeProps } from '@xyflow/react';
import { BrainCircuit } from 'lucide-react';
import { NodeCard, NodeHeader, NodeField } from './NodeComponents';

export default function ChatMemoryNode({ selected }: NodeProps<any>) {
  return (
    <NodeCard selected={selected}>
      <NodeHeader icon={BrainCircuit} title="Chat Memory" color="blue" />
      
      <NodeField label="Memory Type" id="type" inputType="none">
         <div className="text-xs text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-700">
            Postgres History
         </div>
      </NodeField>

      <NodeField label="Session ID" id="session" inputType="target" handleColor="blue">
         <div className="text-[10px] text-slate-500">Dynamic Input</div>
      </NodeField>

      <NodeField label="Memory Context" id="ctx" inputType="source" handleColor="blue">
         <div className="text-right text-[10px] text-slate-500">History</div>
      </NodeField>
    </NodeCard>
  );
}