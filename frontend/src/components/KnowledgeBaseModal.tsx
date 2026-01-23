'use client'
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Upload, Play, CheckCircle, AlertCircle, Loader2, Trash2, Copy, Check } from 'lucide-react';
import axios from 'axios';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function KnowledgeBaseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(""); 
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchDocs = async () => {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (!error) setDocuments(data || []);
  };

  useEffect(() => {
    if (isOpen) fetchDocs();
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload`, formData);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { error } = await supabase.from('documents').insert({
            name: file.name,
            file_path: res.data.filePath,
            status: 'uploaded',
            user_id: user.id 
        });

        if (error) throw error;
        toast.success("Document uploaded");
        await fetchDocs();
    } catch (error) {
        toast.error("Upload failed");
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Are you sure?")) return;
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (!error) {
          toast.success("Document deleted");
          setDocuments(prev => prev.filter(doc => doc.id !== id));
      }
  };

  const handleCopyId = (id: string) => {
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      toast.success("Index ID copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleProcess = async (doc: any) => {
    if (!apiKey) {
        toast.warning("Enter OpenAI API Key above");
        return;
    }
    setProcessingId(doc.id);
    try {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/knowledge/process`, {
            file_path: doc.file_path,
            table_name: "vector_documents",
            openai_api_key: apiKey,
            document_id: doc.id // <--- PASSING THE ID HERE
        });

        await supabase.from('documents').update({ status: 'embedded' }).eq('id', doc.id);
        toast.success("Knowledge Base Updated!");
        await fetchDocs();
    } catch (error) {
        toast.error("Embedding failed");
    }
    setProcessingId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors">
            <Database className="w-4 h-4 text-orange-400" />
            Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 max-w-4xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Database className="w-5 h-5 text-orange-500" /> Knowledge Base Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
            <div className="flex gap-4 p-5 bg-slate-900/50 rounded-xl border border-slate-800 items-end">
                <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">OpenAI Key (For Embeddings)</label>
                    <Input 
                        type="password" 
                        placeholder="sk-..." 
                        className="h-10 bg-slate-950 border-slate-700 text-sm focus:border-orange-500"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-900/80">
                        <TableRow className="border-slate-800 hover:bg-slate-900/80">
                            <TableHead className="text-slate-400 w-[30%]">Filename</TableHead>
                            <TableHead className="text-slate-400 w-[30%]">Index ID</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                            <TableHead className="text-right text-slate-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((doc) => (
                            <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-900/50">
                                <TableCell className="font-medium text-slate-300">{doc.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <code className="text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-400">{doc.id}</code>
                                        <button onClick={() => handleCopyId(doc.id)} className="text-slate-500 hover:text-white transition-colors">
                                            {copiedId === doc.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${doc.status === 'embedded' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                        {doc.status}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {doc.status !== 'embedded' && (
                                            <Button size="sm" variant="ghost" className="h-8 text-xs hover:text-purple-400" onClick={() => handleProcess(doc)} disabled={!!processingId}>
                                                {processingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />} Extract
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-400" onClick={() => handleDelete(doc.id)}><Trash2 size={14} /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}