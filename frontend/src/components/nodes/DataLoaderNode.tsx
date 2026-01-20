import React, { useState, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Database, Upload, Link as LinkIcon, FileText, Loader2, Check } from 'lucide-react';
import BaseNode from './BaseNode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { parseCSV, parseJSON, validateDataset } from '@/lib/visualization-utils';
import { Dataset } from '@/types/visualization';
import axios from 'axios';

const DataLoaderNode = ({ id, data, selected }: any) => {
    const { updateNodeData } = useReactFlow();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'file' | 'url' | 'manual'>('file');
    const [url, setUrl] = useState('');
    const [manualText, setManualText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentDataset = data.dataset as Dataset | undefined;

    const handleDataLoaded = (dataset: Dataset) => {
        if (!validateDataset(dataset)) {
            setError("Invalid dataset structure. Must have columns and data.");
            return;
        }
        updateNodeData(id, { dataset });
        setIsOpen(false);
        setLoading(false);
        setError(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
            const text = await file.text();
            let ds: Dataset;
            if (file.name.endsWith('.csv')) ds = parseCSV(text, file.name);
            else if (file.name.endsWith('.json')) ds = parseJSON(text, file.name);
            else throw new Error('Unsupported file type');
            handleDataLoaded(ds);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleUrlScrape = async () => {
        if (!url) return;
        setLoading(true);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/scrape`, { url });
            handleDataLoaded({
                name: new URL(url).hostname,
                data: res.data.data,
                columns: res.data.columns
            });
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleManual = () => {
        if (!manualText) return;
        setLoading(true);
        try {
            try {
                handleDataLoaded(parseJSON(manualText, 'Manual Input'));
            } catch {
                handleDataLoaded(parseCSV(manualText, 'Manual Input'));
            }
        } catch (err: any) {
            setError("Failed to parse data");
            setLoading(false);
        }
    };

    return (
        <BaseNode
            title="Data Loader"
            icon={Database}
            color="purple"
            selected={selected}
            data={data}
            id={id}
            nodeType="dataLoaderNode"
        >
            <div className="p-3 text-xs text-slate-400 w-64">
                <p className="mb-2">
                    {currentDataset
                        ? `Loaded: ${currentDataset.name} (${currentDataset.data.length} rows)`
                        : "No data loaded."}
                </p>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center justify-center gap-2">
                            {currentDataset ? <><Check className="w-3 h-3" /> Change Data</> : <><Upload className="w-3 h-3" /> Load Data</>}
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-950 border-slate-800 text-slate-200">
                        <DialogHeader>
                            <DialogTitle>Load Dataset</DialogTitle>
                        </DialogHeader>

                        <div className="flex gap-2 mb-4 bg-slate-900 p-1 rounded">
                            {(['file', 'url', 'manual'] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    className={`flex-1 py-1 text-xs font-medium rounded capitalize ${mode === m ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
                        ) : (
                            <div className="space-y-4">
                                {mode === 'file' && (
                                    <div className="border-2 border-dashed border-slate-800 rounded-lg p-8 text-center hover:border-purple-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                                        <p className="text-sm text-slate-400">Click to upload CSV/JSON</p>
                                        <input ref={fileInputRef} type="file" accept=".csv,.json" className="hidden" onChange={handleFileUpload} />
                                    </div>
                                )}
                                {mode === 'url' && (
                                    <div className="flex gap-2">
                                        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/data" className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 text-sm outline-none focus:border-purple-500" />
                                        <button onClick={handleUrlScrape} disabled={!url} className="px-4 py-2 bg-purple-600 rounded text-white text-sm hover:bg-purple-700 disabled:opacity-50">Scrape</button>
                                    </div>
                                )}
                                {mode === 'manual' && (
                                    <div>
                                        <textarea value={manualText} onChange={e => setManualText(e.target.value)} placeholder="Paste JSON or CSV..." className="w-full h-32 bg-slate-900 border border-slate-800 rounded p-3 text-sm font-mono outline-none focus:border-purple-500" />
                                        <button onClick={handleManual} disabled={!manualText} className="w-full mt-2 py-2 bg-purple-600 rounded text-white text-sm hover:bg-purple-700 disabled:opacity-50">Load</button>
                                    </div>
                                )}
                                {error && <p className="text-red-400 text-xs">{error}</p>}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <Handle type="source" position={Position.Right} id="data" className="w-3 h-3 !bg-purple-500" />
        </BaseNode>
    );
};

export default DataLoaderNode;
