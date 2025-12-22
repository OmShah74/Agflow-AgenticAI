import { NodeProps } from '@xyflow/react';
import { Bot, Key } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NodeHeader, NodeField } from './NodeComponents'; // BaseNode handles the card now
import BaseNode from './BaseNode'; // Import the NEW BaseNode

export default function AgentNode({ data, id, selected }: NodeProps<any>) {
  // Logic for standard UI updates
  const handleChange = (k: string, v: string) => data.onChange(id, { ...data, [k]: v });

  return (
    <BaseNode 
        title="Agno Agent" 
        icon={Bot} 
        color="blue" 
        data={data} 
        id={id} 
        selected={selected}
        nodeType="agentNode" // Matches key in nodeTemplates.ts
    >
      {/* STANDARD UI CONTENT (Shown when not custom) */}
      <div className="flex flex-col gap-0">
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
                className="h-20 text-xs bg-slate-900 border-slate-700 resize-none"
                placeholder="You are a helpful assistant..."
                value={data.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
            />
          </NodeField>

          <NodeField label="Groq API Key (Optional)" id="key" inputType="none">
            <div className="relative">
                <Key className="absolute left-2 top-2 w-3 h-3 text-slate-500" />
                <Input 
                    type="password" 
                    className="h-8 pl-7 text-xs bg-slate-900 border-slate-700" 
                    placeholder="gsk_..."
                    value={data.groqApiKey}
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