import { Handle, Position, NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';
import { Input } from "@/components/ui/input";
import BaseNode from './BaseNode';

export default function GmailNode({ data, id }: NodeProps<any>) {
  const updateData = (field: string, value: string) => {
    if (data.onChange) data.onChange(id, { ...data, [field]: value });
  };

  return (
    <BaseNode title="Gmail Tool" icon={Mail} color="red">
      <div className="flex flex-col gap-3">
        <Input 
            placeholder="Email Address" 
            className="h-7 text-xs bg-slate-900 border-slate-800"
            onChange={(e) => updateData('email', e.target.value)} 
        />
        <Input 
            placeholder="App Password" 
            type="password" 
            className="h-7 text-xs bg-slate-900 border-slate-800"
            onChange={(e) => updateData('password', e.target.value)} 
        />
        <div className="flex justify-end mt-1">
             <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Tool</span>
                <Handle type="source" position={Position.Right} className="!bg-red-500 !w-3 !h-3" />
            </div>
        </div>
      </div>
    </BaseNode>
  );
}