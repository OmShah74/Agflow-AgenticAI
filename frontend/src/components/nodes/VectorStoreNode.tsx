import { NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';
import { Input } from "@/components/ui/input";
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function VectorStoreNode({ data, id, selected }: NodeProps<any>) {
  return (
    <BaseNode 
        title="Supabase Vector" 
        icon={Database} 
        color="orange" 
        data={data} 
        id={id} 
        selected={selected} 
        nodeType="vectorStore"
    >
      <NodeField label="Table Name" id="table" inputType="none">
        <Input 
            defaultValue="knowledge_base"
            className="h-8 text-xs bg-slate-900 border-slate-700"
            placeholder="e.g. documents"
            value={data.tableName}
            onChange={(e) => data.onChange && data.onChange(id, { ...data, tableName: e.target.value })}
        />
      </NodeField>
      
      <NodeField label="File Input" id="doc" inputType="target" handleColor="orange">
         <div className="text-[10px] text-slate-500">PDF Path</div>
      </NodeField>

      <NodeField label="Knowledge Base" id="kb" inputType="source" handleColor="purple">
         <div className="text-right text-[10px] text-slate-500">KB Object</div>
      </NodeField>
    </BaseNode>
  );
}