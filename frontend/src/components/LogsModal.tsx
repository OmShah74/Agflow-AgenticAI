'use client'
import React, { useState, useEffect } from 'react';
import { 
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { ScrollText, RefreshCw, Box } from 'lucide-react';
import axios from 'axios';
import { createClient } from '@/utils/supabase/client';
import { Button } from "@/components/ui/button";

export default function LogsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchLogs = async () => {
      setLoading(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/logs/${user.id}`);
          if (Array.isArray(res.data)) {
              setLogs(res.data);
          } else {
              setLogs([]);
          }
      } catch (e) {
          console.error("Failed to fetch logs:", e);
          setLogs([]);
      }
      setLoading(false);
  };

  useEffect(() => {
      if (isOpen) fetchLogs();
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {/* FIX: Moved to left-6 to avoid overlap with Chat Send button */}
        <button className="fixed bottom-6 left-6 z-50 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-purple-500 p-3 rounded-full shadow-xl transition-all duration-300 flex items-center gap-2 group">
            <ScrollText size={20} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-sm font-medium whitespace-nowrap">
                View Logs
            </span>
        </button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[60vh] bg-slate-950 border-t border-slate-800 p-0 text-slate-200">
        <SheetHeader className="sr-only">
            <SheetTitle>Execution Logs</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/10 rounded-md border border-purple-500/20">
                        <ScrollText className="text-purple-400" size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white">Execution Logs</h2>
                        <p className="text-[10px] text-slate-500 font-medium">Real-time trace of component execution</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading} className="text-slate-400 hover:text-white hover:bg-slate-800">
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
            </div>

            <div className="flex-1 overflow-auto bg-[#0a0a0a]">
                <Table>
                    <TableHeader className="bg-slate-900/80 sticky top-0 backdrop-blur-sm z-10">
                        <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-[10px] font-bold text-slate-500 w-40">TIMESTAMP</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-500 w-48">COMPONENT</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-500 w-24">STATUS</TableHead>
                            <TableHead className="text-[10px] font-bold text-slate-500">PAYLOAD</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!Array.isArray(logs) || logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-16 text-slate-600">
                                    <div className="flex flex-col items-center gap-2">
                                        <Box size={24} className="opacity-20" />
                                        <p className="text-xs">No execution history found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id} className="border-slate-800/50 hover:bg-slate-900/30 group text-xs font-mono transition-colors">
                                    <TableCell className="text-slate-500 whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-purple-300 font-semibold">{log.node_type}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                                            log.status === 'success' 
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            {log.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-4xl">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-slate-500 uppercase font-sans">Inputs</span>
                                                <div className="bg-slate-900/50 p-2 rounded border border-slate-800 overflow-x-auto">
                                                    <code className="text-orange-200/90 whitespace-pre-wrap break-all">
                                                        {JSON.stringify(log.inputs)}
                                                    </code>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-slate-500 uppercase font-sans">Output</span>
                                                <div className="bg-slate-900/50 p-2 rounded border border-slate-800 overflow-x-auto">
                                                    <code className="text-blue-200/90 whitespace-pre-wrap break-words">
                                                        {log.outputs}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}