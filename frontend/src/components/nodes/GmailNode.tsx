import { NodeProps } from '@xyflow/react';
import { Mail } from 'lucide-react';
import { Input } from "@/components/ui/input";
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function GmailNode({ data, id, selected }: NodeProps<any>) {
  const updateData = (field: string, value: string) => {
    if (data.onChange) data.onChange(id, { ...data, [field]: value });
  };

  return (
    <BaseNode 
        title="Gmail Tool" 
        icon={Mail} 
        color="red" 
        data={data} 
        id={id} 
        selected={selected} 
        nodeType="gmailNode"
    >
      <div className="flex flex-col gap-0">
          <NodeField label="Email Address" id="email" inputType="none">
            <Input 
                placeholder="user@gmail.com" 
                className="h-8 text-xs bg-slate-900 border-slate-700"
                value={data.email || ''}
                onChange={(e) => updateData('email', e.target.value)} 
            />
          </NodeField>

          <NodeField label="App Password" id="pass" inputType="none">
            <Input 
                placeholder="••••••••••••" 
                type="password" 
                className="h-8 text-xs bg-slate-900 border-slate-700"
                value={data.password || ''}
                onChange={(e) => updateData('password', e.target.value)} 
            />
          </NodeField>

          <NodeField label="Tool Instance" id="tool" inputType="source" handleColor="red">
             <div className="text-right text-[10px] text-slate-500">Toolkit</div>
          </NodeField>
      </div>
    </BaseNode>
  );
}