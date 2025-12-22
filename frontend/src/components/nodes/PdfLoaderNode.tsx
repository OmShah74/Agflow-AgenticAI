import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileText, Upload } from 'lucide-react';
import BaseNode from './BaseNode';
import { useState } from 'react';
import axios from 'axios';

export default function PdfLoaderNode({ data, id }: NodeProps<any>) {
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
        // Pass the server-side file path to the node data
        if(data.onChange) data.onChange(id, { ...data, filePath: res.data.filePath, filename: res.data.filename });
    } catch (error) {
        alert("Upload failed");
    }
    setUploading(false);
  };

  return (
    <BaseNode title="PDF Loader" icon={FileText} color="orange">
      <div className="flex flex-col gap-3">
        <div className="border border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-900/50 transition relative">
            <input type="file" accept=".pdf" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload className="w-5 h-5 text-slate-500 mb-2" />
            <span className="text-[10px] text-slate-400">
                {uploading ? "Uploading..." : fileName || "Click to Upload PDF"}
            </span>
        </div>
        <div className="flex justify-end mt-1">
             <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">File</span>
                <Handle type="source" position={Position.Right} className="!bg-orange-500 !w-3 !h-3" />
            </div>
        </div>
      </div>
    </BaseNode>
  );
}