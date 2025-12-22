import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';
import BaseNode from './BaseNode';

export default function WebSearchNode() {
  return (
    <BaseNode title="DuckDuckGo Search" icon={Globe} color="blue">
      <div className="text-xs text-slate-500 italic mb-2">
        Performs web searches without an API key.
      </div>
      <div className="flex justify-end">
         <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Tool</span>
            <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-3 !h-3" />
        </div>
      </div>
    </BaseNode>
  );
}