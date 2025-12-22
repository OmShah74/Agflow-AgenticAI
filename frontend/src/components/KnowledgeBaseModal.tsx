'use client'
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Upload, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { createClient } from '@/utils/supabase/client';

export default function KnowledgeBaseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Temporary input for OpenAI Key (required for embedding process)
  const [apiKey, setApiKey] = useState(""); 
  const supabase = createClient();

  // Fetch documents from Supabase
  const fetchDocs = async () => {
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
        
        // 2. Record in Supabase
        const { error } = await supabase.from('documents').insert({
            name: file.name,
            file_path: res.data.filePath,
            status: 'uploaded'
        });

        if (error) throw error;
        
        await fetchDocs();
    } catch (error) {
        console.error("Upload failed", error);
        alert("Upload failed. Check console.");
    }
    setUploading(false);
  };

  // Handle RAG Extraction
  const handleProcess = async (doc: any) => {
    if (!apiKey) {
        alert("Please enter your OpenAI API Key at the top to process embeddings.");
        return;
    }
    setProcessingId(doc.id);
    try {
        // 1. Trigger Backend Processing
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/knowledge/process`, {
            file_path: doc.file_path,
            table_name: "vector_documents", // Standard table for this app
            openai_api_key: apiKey
        });

        // 2. Update Status
        await supabase.from('documents').update({ status: 'embedded' }).eq('id', doc.id);
        await fetchDocs();
    } catch (error) {
        console.error("Processing failed", error);
        alert("Embedding failed. Check backend logs.");
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
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-orange-500" /> 
            Knowledge Base Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
            {/* Controls */}
            <div className="flex gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] uppercase text-slate-500 font-bold">OpenAI Key (For Embeddings)</label>
                    <Input 
                        type="password" 
                        placeholder="sk-..." 
                        className="h-9 bg-slate-950 border-slate-700 text-xs"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>
                <div className="flex items-end">
                    <div className="relative">
                        <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.txt" />
                        <Button className="gap-2 bg-purple-600 hover:bg-purple-700 transition-colors">
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload Document
                        </Button>
                    </div>
                </div>
            </div>

            {/* File List */}
            <div className="rounded-md border border-slate-800 bg-slate-900/30 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-900">
                        <TableRow className="border-slate-800 hover:bg-slate-900">
                            <TableHead className="text-slate-400">Filename</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                            <TableHead className="text-right text-slate-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                                    No documents found. Upload one to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            documents.map((doc) => (
                                <TableRow key={doc.id} className="border-slate-800 hover:bg-slate-900/50">
                                    <TableCell className="font-medium text-slate-300">{doc.name}</TableCell>
                                    <TableCell>
                                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium border ${
                                            doc.status === 'embedded' 
                                            ? 'bg-green-950/30 border-green-900 text-green-400' 
                                            : 'bg-yellow-950/30 border-yellow-900 text-yellow-400'
                                        }`}>
                                            {doc.status === 'embedded' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                            {doc.status.toUpperCase()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {doc.status !== 'embedded' && (
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-7 text-xs hover:bg-orange-950/30 hover:text-orange-400"
                                                onClick={() => handleProcess(doc)}
                                                disabled={!!processingId}
                                            >
                                                {processingId === doc.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" /> 
                                                ) : (
                                                    <Play className="w-3 h-3 mr-1" /> 
                                                )}
                                                Extract & Embed
                                            </Button>
                                        )}
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