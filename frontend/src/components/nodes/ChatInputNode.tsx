import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';

export default function ChatInputNode() {
  return (
    <BaseNode title="Chat Input" icon={MessageSquare} color="blue">
      <div className="p-2 bg-slate-900/50 rounded border border-slate-800 border-dashed">
        <p className="text-[10px] text-slate-400 text-center italic">
            "User Message"
        </p>
        <p className="text-[10px] text-slate-500 text-center mt-1">
            Accepts text from the playground chat window.
        </p>
      </div>
      <div className="flex justify-end mt-2">
        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Message</span>
            <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
        </div>
      </div>
    </BaseNode>
  );
}