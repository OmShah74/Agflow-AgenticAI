import { NodeProps } from '@xyflow/react';
import { Code, Eye } from 'lucide-react';
import { NodeCard, NodeHeader, NodeField } from './NodeComponents';

export default function HTMLRendererNode({ data, id, selected }: NodeProps<any>) {
  return (
    <NodeCard selected={selected}>
      <NodeHeader icon={Code} title="HTML Renderer" color="orange" />
      
      <NodeField label="HTML Source" id="in" inputType="target" handleColor="purple">
         <div className="text-[10px] text-slate-500">Connect text/html here</div>
      </NodeField>

      <NodeField label="Preview" id="preview" inputType="none">
         <div className="w-full h-32 bg-white rounded overflow-hidden p-1">
             <div className="w-full h-full border border-slate-200 text-black text-[10px] p-1 overflow-auto">
                 {data.htmlContent ? (
                     <div dangerouslySetInnerHTML={{ __html: data.htmlContent }} />
                 ) : (
                     <div className="flex items-center justify-center h-full text-slate-400 gap-1">
                         <Eye size={12} /> No Content
                     </div>
                 )}
             </div>
         </div>
      </NodeField>
    </NodeCard>
  );
}