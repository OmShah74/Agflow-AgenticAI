import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code } from 'lucide-react';
import BaseNode from './BaseNode';
import { Textarea } from "@/components/ui/textarea";

export default function PromptBuilderNode({ data, id }: NodeProps<any>) {
  return (
    <BaseNode title="Prompt Builder" icon={Code} color="purple">
      <div className="flex flex-col gap-2">
        <div className="space-y-1">
             <label className="text-[10px] text-slate-500 font-bold uppercase">Template</label>
             <Textarea 
                className="text-xs bg-slate-900 border-slate-800 text-slate-300 min-h-[60px]"
                placeholder="You are a {role}. Answer: {question}"
                onChange={(e) => data.onChange && data.onChange(id, { ...data, template: e.target.value })}
             />
        </div>
        
        <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
                <Handle type="target" position={Position.Left} id="vars" className="!bg-purple-500 !w-3 !h-3" />
                <span className="text-xs text-slate-400">Vars</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Prompt</span>
                <Handle type="source" position={Position.Right} id="out" className="!bg-purple-500 !w-3 !h-3" />
            </div>
        </div>
      </div>
    </BaseNode>
  );
}