import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import BaseNode from './BaseNode';
import { NodeField } from './NodeComponents';
import { useState } from 'react';
import axios from 'axios';

export default function PdfLoaderNode({ data, id, selected }: NodeProps<any>) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState(data.filename || "");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload`, formData);
        setFileName(res.data.filename);
        if(data.onChange) data.onChange(id, { ...data, filePath: res.data.filePath, filename: res.data.filename });
    } catch (error) {
        alert("Upload failed");
    }
    setUploading(false);
  };

  return (
    <BaseNode 
        title="PDF Loader" 
        icon={FileText} 
        color="orange" 
        data={data} 
        id={id} 
        selected={selected} 
        nodeType="pdfLoader"
    >
      <NodeField label="Document File" id="file" inputType="none">
        <div className="relative group">
            <div className="border border-dashed border-slate-700 bg-slate-900/50 rounded-lg h-20 flex flex-col items-center justify-center text-center cursor-pointer group-hover:bg-slate-900/80 group-hover:border-orange-500/50 transition-all">
                <input type="file" accept=".pdf" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                {uploading ? (
                    <div className="flex flex-col items-center gap-1">
                        <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                        <span className="text-[10px] text-slate-400">Uploading...</span>
                    </div>
                ) : (
                    <>
                        <Upload className="w-4 h-4 text-slate-500 mb-1 group-hover:text-orange-400 transition-colors" />
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300 max-w-[200px] truncate px-2">
                            {fileName || "Click to Upload PDF"}
                        </span>
                    </>
                )}
            </div>
        </div>
      </NodeField>

      <NodeField label="File Path Output" id="path" inputType="source" handleColor="orange">
         <div className="text-right text-[10px] text-slate-500">String Path</div>
      </NodeField>
    </BaseNode>
  );
}