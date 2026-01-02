import { NodeProps } from '@xyflow/react';
import { Bot, Key, MessageSquare } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';

export default function AgentNode({ data, id, selected }: NodeProps<any>) {
  const handleChange = (k: string, v: string) => data.onChange(id, { ...data, [k]: v });

  return (
    <BaseNode 
        title="Agno Agent" 
        icon={Bot} 
        color="blue" 
        data={data} 
        id={id} 
        selected={selected}
        nodeType="agentNode"
    >
      <div className="flex flex-col gap-0">
          <NodeField label="User Input" id="input" inputType="target" handleColor="blue">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 italic bg-slate-900/50 px-2 py-1 rounded border border-slate-800">
                <MessageSquare size={12} />
                <span>Connect Chat Input</span>
            </div>
          </NodeField>

          <NodeField label="Model Provider" id="model" inputType="target" handleColor="green">
            <div className="text-xs text-green-400 border border-green-900/50 bg-green-950/30 px-2 py-1 rounded">
                LLM Input
            </div>
          </NodeField>

          <NodeField label="Tools & Knowledge" id="tools" inputType="target" handleColor="orange">
            <div className="text-xs text-orange-400 border border-orange-900/50 bg-orange-950/30 px-2 py-1 rounded">
                Tools / RAG
            </div>
          </NodeField>

          <NodeField label="System Instructions" id="system" inputType="none">
            <Textarea 
                className="h-20 text-xs bg-slate-900 border-slate-700 resize-none placeholder:text-slate-600 focus:border-blue-500 transition-colors"
                placeholder="You are a helpful assistant..."
                // FIX: Ensure value is never undefined
                value={data.systemPrompt || ''}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
            />
          </NodeField>

          <NodeField label="Groq API Key (Optional)" id="key" inputType="none">
            <div className="relative">
                <Key className="absolute left-2 top-2.5 w-3 h-3 text-slate-500" />
                <Input 
                    type="password" 
                    className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 placeholder:text-slate-600 focus:border-blue-500 transition-colors" 
                    placeholder="gsk_..."
                    // FIX: Ensure value is never undefined
                    value={data.groqApiKey || ''}
                    onChange={(e) => handleChange('groqApiKey', e.target.value)}
                />
            </div>
          </NodeField>

          <NodeField label="Agent Response" id="response" inputType="source" handleColor="blue">
            <div className="text-right text-[10px] text-slate-500">Text Stream</div>
          </NodeField>
      </div>
    </BaseNode>
  );
}