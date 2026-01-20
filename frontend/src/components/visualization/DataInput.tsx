'use client';

import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, FileText, Loader2 } from 'lucide-react';
import { parseCSV, parseJSON } from '@/lib/visualization-utils';
import { Dataset } from '@/types/visualization';
import axios from 'axios';

interface DataInputProps {
    onDataLoaded: (dataset: Dataset) => void;
}

export default function DataInput({ onDataLoaded }: DataInputProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inputMode, setInputMode] = useState<'file' | 'url' | 'manual'>('file');
    const [url, setUrl] = useState('');
    const [manualData, setManualData] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        try {
            const text = await file.text();
            let dataset: Dataset;

            if (file.name.endsWith('.csv')) {
                dataset = parseCSV(text, file.name);
            } else if (file.name.endsWith('.json')) {
                dataset = parseJSON(text, file.name);
            } else {
                throw new Error('Unsupported file type. Please upload CSV or JSON.');
            }

            onDataLoaded(dataset);
        } catch (err: any) {
            setError(err.message || 'Failed to parse file');
        } finally {
            setLoading(false);
        }
    };

    const handleUrlScrape = async () => {
        if (!url.trim()) {
            setError('Please enter a URL');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Using backend endpoint
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/scrape`, { url: url.trim() });

            const result = response.data;
            const dataset: Dataset = {
                name: `Data from ${new URL(url).hostname}`,
                data: result.data,
                columns: result.columns,
            };

            onDataLoaded(dataset);
            setUrl('');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || err.message || 'Failed to scrape URL');
        } finally {
            setLoading(false);
        }
    };

    const handleManualData = () => {
        if (!manualData.trim()) {
            setError('Please enter some data');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Try JSON first
            let dataset: Dataset;
            try {
                dataset = parseJSON(manualData, 'Manual Input');
            } catch {
                // Fall back to CSV
                dataset = parseCSV(manualData, 'Manual Input');
            }

            onDataLoaded(dataset);
            setManualData('');
        } catch (err: any) {
            setError(err.message || 'Failed to parse data');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/50 p-3 space-y-3 rounded-lg border border-slate-800">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Load Data</h3>
                <p className="text-slate-500 text-xs">Upload CSV/JSON or paste data</p>
            </div>

            {/* Compact Mode Selection */}
            <div className="flex gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
                <button
                    onClick={() => setInputMode('file')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all ${inputMode === 'file'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <Upload className="inline w-3 h-3 mr-1" />
                    File
                </button>
                <button
                    onClick={() => setInputMode('url')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all ${inputMode === 'url'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <LinkIcon className="inline w-3 h-3 mr-1" />
                    URL
                </button>
                <button
                    onClick={() => setInputMode('manual')}
                    className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-all ${inputMode === 'manual'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    <FileText className="inline w-3 h-3 mr-1" />
                    Paste
                </button>
            </div>

            {/* Input Area */}
            <div className="space-y-2">
                {inputMode === 'file' && (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.json"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading}
                            className="w-full bg-slate-950 hover:bg-slate-950/50 border border-dashed border-slate-700 hover:border-purple-500 rounded p-4 transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 mx-auto animate-spin text-purple-500" />
                            ) : (
                                <>
                                    <Upload className="w-6 h-6 mx-auto mb-1 text-slate-500" />
                                    <p className="text-slate-300 text-xs">Click to upload</p>
                                    <p className="text-slate-600 text-[10px]">CSV or JSON</p>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {inputMode === 'url' && (
                    <div className="space-y-2">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/data"
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            disabled={loading}
                        />
                        <button
                            onClick={handleUrlScrape}
                            disabled={loading || !url.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Scraping...
                                </>
                            ) : (
                                'Scrape Data'
                            )}
                        </button>
                    </div>
                )}

                {inputMode === 'manual' && (
                    <div className="space-y-2">
                        <textarea
                            value={manualData}
                            onChange={(e) => setManualData(e.target.value)}
                            placeholder="Paste CSV or JSON..."
                            rows={4}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-slate-200 focus:border-purple-500 outline-none resize-none"
                            disabled={loading}
                        />
                        <button
                            onClick={handleManualData}
                            disabled={loading || !manualData.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium py-1.5 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Load Data'
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/10 border border-red-900/30 p-2 rounded">
                    <p className="text-red-400 text-[10px]">{error}</p>
                </div>
            )}
        </div>
    );
}
