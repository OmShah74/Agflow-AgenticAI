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
            <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 w-[95vw] lg:w-[1200px] max-w-[95vw] lg:max-w-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh] z-[100]">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-800/50">
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                        <Database className="w-6 h-6 text-orange-500" /> Knowledge Base Manager
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                    <div className="flex flex-col lg:flex-row gap-6 p-6 bg-slate-900/40 rounded-2xl border border-slate-800/50 items-end shadow-inner">
                        <div className="w-full lg:flex-1 space-y-2">
                            <label className="text-[11px] uppercase text-slate-500 font-extrabold ml-1 tracking-widest">OpenAI Key (For Embeddings)</label>
                            <Input
                                type="password"
                                placeholder="sk-..."
                                className="h-12 bg-slate-950 border-slate-700 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 shadow-inner px-4 rounded-xl transition-all"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>
                        <div className="w-full lg:w-52 h-12 relative group">
                            <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                            <Button className="w-full h-full gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30 transition-all active:scale-95 z-10 font-bold rounded-xl border-t border-white/10 uppercase tracking-wide text-xs">
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? 'Processing...' : 'Upload File'}
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
                        <div className="w-full">
                            <Table className="table-auto w-full border-collapse">
                                <TableHeader className="bg-slate-900/80 sticky top-0 z-10">
                                    <TableRow className="border-slate-800/50 hover:bg-transparent">
                                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] px-6 py-4">Filename</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] px-6 py-4">Index ID</TableHead>
                                        <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-[11px] px-6 py-4 text-center">Status</TableHead>
                                        <TableHead className="text-right text-slate-500 font-bold uppercase tracking-wider text-[11px] px-6 py-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-48 text-center text-slate-500 text-sm italic">
                                                <div className="flex flex-col items-center gap-3 opacity-30">
                                                    <Database className="w-12 h-12 mb-2" />
                                                    <p>No documents found. Upload one to get started.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.map((doc) => (
                                            <TableRow key={doc.id} className="border-slate-800/50 hover:bg-slate-800/20 transition-all group h-16">
                                                <TableCell className="font-semibold text-slate-300 px-6 py-4 min-w-[150px]">
                                                    <div className="truncate max-w-[200px]" title={doc.name}>{doc.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 group/id">
                                                        <code className="text-[11px] bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 truncate max-w-[300px] font-mono shadow-inner group-hover/id:text-purple-300 transition-colors" title={doc.id}>
                                                            {doc.id}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopyId(doc.id)}
                                                            className="text-slate-500 hover:text-purple-400 transition-all opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-slate-800 hover:shadow-lg"
                                                            title="Copy ID"
                                                        >
                                                            {copiedId === doc.id ? <Check size={14} className="text-green-400" /> : <Copy size={15} />}
                                                        </button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-extrabold border uppercase tracking-[0.15em] shadow-sm whitespace-nowrap ${doc.status === 'embedded' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${doc.status === 'embedded' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                                                        {doc.status}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-3 min-w-[140px]">
                                                        {doc.status !== 'embedded' && (
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="h-9 px-4 text-[11px] font-extrabold bg-purple-600/5 text-purple-400 border border-purple-600/20 hover:bg-purple-600 hover:text-white transition-all shadow-lg active:scale-95 uppercase tracking-wider"
                                                                onClick={(e) => { e.stopPropagation(); handleProcess(doc); }}
                                                                disabled={!!processingId}
                                                            >
                                                                {processingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />}
                                                                EXTRACT
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-9 w-9 text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-lg"
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                                                        >
                                                            <Trash2 size={16} />
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
                </div>
            </DialogContent>
        </Dialog>
    );
}