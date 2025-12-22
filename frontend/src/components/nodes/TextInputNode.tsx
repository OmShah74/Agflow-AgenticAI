import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import BaseNode from './BaseNode';
import { Textarea } from "@/components/ui/textarea";

export default function TextInputNode({ data, id }: NodeProps<any>) {
  return (
    <BaseNode title="Text Input" icon={FileText} color="slate">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-slate-500 font-bold uppercase">Value</label>
        <Textarea 
            className="text-xs bg-slate-900 border-slate-800 text-slate-300 min-h-[80px] resize-none focus:ring-purple-500" 
            placeholder="Enter text here..."
            onChange={(e) => data.onChange && data.onChange(id, { ...data, value: e.target.value })}
        />
        <div className="flex justify-end mt-1">
             <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Text</span>
                <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-3 !h-3" />
            </div>
        </div>
      </div>
    </BaseNode>
  );
}