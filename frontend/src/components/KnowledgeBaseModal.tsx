'use client'
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Upload, Play, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export default function KnowledgeBaseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Temporary input for OpenAI Key
  const [apiKey, setApiKey] = useState(""); 
  const supabase = createClient();

  // Fetch documents
  const fetchDocs = async () => {
    // We fetch documents belonging to the user
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (!error) setDocuments(data || []);
  };

  useEffect(() => {
    if (isOpen) fetchDocs();
  }, [isOpen]);

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
        // 1. Upload to Backend (Disk)
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/upload`, formData);
        
        // 2. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // 3. Record in Supabase
        const { error } = await supabase.from('documents').insert({
            name: file.name,
            file_path: res.data.filePath,
            status: 'uploaded',
            user_id: user?.id // Ensure RLS works
        });

        if (error) throw error;
        
        toast.success("Document uploaded");
        await fetchDocs();
    } catch (error) {
        console.error("Upload failed", error);
        toast.error("Upload failed");
    }
    setUploading(false);
  };

  // Handle Delete
  const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this document?")) return;

      try {
          const { error } = await supabase.from('documents').delete().eq('id', id);
          if (error) throw error;
          
          toast.success("Document deleted");
          // Update UI immediately
          setDocuments(prev => prev.filter(doc => doc.id !== id));
      } catch (error) {
          console.error("Delete failed", error);
          toast.error("Failed to delete document");
      }
  };

  // Handle RAG Extraction
  const handleProcess = async (doc: any) => {
    if (!apiKey) {
        toast.warning("Please enter OpenAI API Key to process embeddings.");
        return;
    }
    setProcessingId(doc.id);
    try {
        // 1. Trigger Backend Processing
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/knowledge/process`, {
            file_path: doc.file_path,
            table_name: "vector_documents",
            openai_api_key: apiKey
        });

        // 2. Update Status in DB
        await supabase.from('documents').update({ status: 'embedded' }).eq('id', doc.id);
        
        toast.success("Embeddings generated successfully!");
        await fetchDocs();
    } catch (error) {
        console.error("Processing failed", error);
        toast.error("Embedding failed. Check backend logs.");
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
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 max-w-3xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Database className="w-5 h-5 text-orange-500" /> 
            Knowledge Base Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
            {/* Controls */}
            <div className="flex gap-4 p-5 bg-slate-900/50 rounded-xl border border-slate-800 items-end">
                <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">OpenAI Key (For Embeddings)</label>
                    <Input 
                        type="password" 
                        placeholder="sk-..." 
                        className="h-10 bg-slate-950 border-slate-700 text-sm focus:border-orange-500 transition-colors"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".pdf,.txt" />
                    <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload Document
                    </Button>
                </div>
            </div>

            {/* File List */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-900/80">
                        <TableRow className="border-slate-800 hover:bg-slate-900/80">
                            <TableHead className="text-slate-400 font-medium w-[40%]">Filename</TableHead>
                            <TableHead className="text-slate-400 font-medium">Status</TableHead>
                            <TableHead className="text-right text-slate-400 font-medium">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={3} className="text-center text-slate-500 py-12">
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-8 h-8 opacity-20" />
                                        <p>No documents found. Upload one to get started.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-900/50 transition-colors">
                                    <TableCell className="font-medium text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-800 rounded text-slate-400">
                                                <Database size={14} />
                                            </div>
                                            {doc.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide ${
                                            doc.status === 'embedded' 
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {doc.status === 'embedded' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                            {doc.status.toUpperCase()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Embed Button */}
                                            {doc.status !== 'embedded' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 text-xs hover:bg-purple-500/10 hover:text-purple-400 border border-transparent hover:border-purple-500/20"
                                                    onClick={() => handleProcess(doc)}
                                                    disabled={!!processingId}
                                                >
                                                    {processingId === doc.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> 
                                                    ) : (
                                                        <Play className="w-3.5 h-3.5 mr-1.5" /> 
                                                    )}
                                                    Extract
                                                </Button>
                                            )}
                                            
                                            {/* Delete Button */}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                onClick={() => handleDelete(doc.id)}
                                                title="Delete Document"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}