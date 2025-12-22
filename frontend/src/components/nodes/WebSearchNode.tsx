import { NodeProps } from '@xyflow/react';
import { Globe } from 'lucide-react';
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function WebSearchNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="DuckDuckGo Search" 
        icon={Globe} 
        color="blue" 
        data={data} 
        id={id} 
        selected={selected} 
        nodeType="webSearchNode"
    >
      <div className="p-3 bg-blue-950/20 rounded border border-blue-900/30 m-3 mb-0">
        <p className="text-[10px] text-blue-200/70 italic text-center">
          "Performs web searches without an API key."
        </p>
      </div>

      <NodeField label="Tool Output" id="tool" inputType="source" handleColor="blue">
         <div className="text-right text-[10px] text-slate-500">Toolkit</div>
      </NodeField>
    </BaseNode>
  );
}