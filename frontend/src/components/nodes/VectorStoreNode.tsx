import { NodeProps } from '@xyflow/react';
import { Database, Key, Copy } from 'lucide-react';
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
      <div className="flex flex-col gap-0">
          <NodeField label="Table Name" id="table" inputType="none">
            <Input 
                className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-300"
                placeholder="e.g. vector_documents"
                value={data.tableName || 'vector_documents'} 
                onChange={(e) => data.onChange && data.onChange(id, { ...data, tableName: e.target.value })}
            />
          </NodeField>
          
          {/* NEW: Input for ID instead of File Handle */}
          <NodeField label="Index ID (Document ID)" id="index" inputType="none">
             <div className="relative">
                <Key className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                <Input 
                    className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-slate-300 placeholder:text-slate-600 focus:border-orange-500 font-mono"
                    placeholder="Paste ID from KB..."
                    value={data.indexId || ''}
                    onChange={(e) => data.onChange && data.onChange(id, { ...data, indexId: e.target.value })}
                />
             </div>
          </NodeField>

          <NodeField label="Knowledge Base" id="kb" inputType="source" handleColor="purple">
             <div className="text-right text-[10px] text-slate-500">KB Object</div>
          </NodeField>
      </div>
    </BaseNode>
  );
}