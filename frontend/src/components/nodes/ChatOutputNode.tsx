import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import BaseNode from './BaseNode';

export default function ChatOutputNode() {
  return (
    <BaseNode title="Chat Output" icon={MessageSquare} color="blue">
      <div className="flex items-center gap-2 mb-2">
        <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-3 !h-3" />
        <span className="text-xs text-slate-400">Result</span>
      </div>
      <div className="p-2 bg-slate-900/50 rounded border border-slate-800 border-dashed min-h-[40px] flex items-center justify-center">
        <p className="text-[10px] text-slate-500 italic">
            Final Response Display
        </p>
      </div>
    </BaseNode>
  );
}