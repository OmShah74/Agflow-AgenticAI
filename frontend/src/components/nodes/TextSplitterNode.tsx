import { NodeProps } from '@xyflow/react';
import { Scissors } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { NodeCard, NodeHeader, NodeField } from './NodeComponents';

export default function TextSplitterNode({ data, id, selected }: NodeProps<any>) {
  return (
    <NodeCard selected={selected}>
      <NodeHeader icon={Scissors} title="Recursive Splitter" color="orange" />
      
      <NodeField label="Chunk Size" id="size" inputType="none">
         <Input 
            className="h-7 bg-slate-900 border-slate-700 text-xs" 
            defaultValue="1000" 
            type="number"
            onChange={(e) => data.onChange(id, { ...data, chunkSize: e.target.value })}
         />
      </NodeField>
      
      <NodeField label="Chunk Overlap" id="overlap" inputType="none">
         <Input 
            className="h-7 bg-slate-900 border-slate-700 text-xs" 
            defaultValue="200" 
            type="number"
            onChange={(e) => data.onChange(id, { ...data, chunkOverlap: e.target.value })}
         />
      </NodeField>

      <div className="flex justify-between items-center mt-2 px-4 pb-2">
            <div className="text-[10px] text-slate-500">Document</div>
            <div className="text-[10px] text-slate-500">Chunks</div>
      </div>
    </NodeCard>
  );
}