import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database } from 'lucide-react';
import { Input } from "@/components/ui/input";
import BaseNode from './BaseNode';

export default function VectorStoreNode({ data, id }: NodeProps<any>) {
  return (
    <BaseNode title="Supabase Vector" icon={Database} color="orange">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold">Table Name</label>
            <Input 
                defaultValue="knowledge_base"
                className="h-7 text-xs bg-slate-900 border-slate-800"
                placeholder="e.g. documents"
                onChange={(e) => data.onChange && data.onChange(id, { ...data, tableName: e.target.value })}
            />
        </div>
        
        <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
                <Handle type="target" position={Position.Left} className="!bg-orange-500 !w-3 !h-3" />
                <span className="text-xs text-slate-400">Doc</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">KB</span>
                <Handle type="source" position={Position.Right} className="!bg-purple-500 !w-3 !h-3" />
            </div>
        </div>
      </div>
    </BaseNode>
  );
}