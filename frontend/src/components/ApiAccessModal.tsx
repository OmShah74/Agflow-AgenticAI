'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check, Terminal, Code2, Info, Eye, EyeOff, Key, Hash } from 'lucide-react'
import { toast } from 'sonner'

interface ApiAccessModalProps {
    isOpen: boolean
    onClose: () => void
    flowId: string | null
    apiKey: string | null
}

export default function ApiAccessModal({ isOpen, onClose, flowId, apiKey }: ApiAccessModalProps) {
    const [copied, setCopied] = useState(false)
    const [apiKeyVisible, setApiKeyVisible] = useState(false)

    // Fallback for window origin in SSR
    const envUrl = process.env.NEXT_PUBLIC_APP_URL
    const baseUrl = envUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    const displayFlowId = flowId || 'NOT_SAVED_YET'
    const displayApiKey = apiKey || 'GENERATE_BY_SIGNING_UP'

    const pythonCode = `import requests

# API Configuration
API_KEY = "${displayApiKey}"
FLOW_ID = "${displayFlowId}"
URL = f"${baseUrl}/api/v1/run/{FLOW_ID}"

# Payload structure
payload = {
    "inputs": {
        "input_value": "What is the capital of France?"
    },
    "tweaks": {
        # Optional: override model settings or parameters here
    }
}

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

print(f"🚀 Running Agflow: {FLOW_ID}...")
response = requests.post(URL, json=payload, headers=headers)

if response.status_code == 200:
    print("✅ Success!")
    print(response.json())
else:
    print(f"❌ Error {response.status_code}: {response.text}")
`

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard`)
    }

    const handleCopyMain = () => {
        navigator.clipboard.writeText(pythonCode)
        setCopied(true)
        toast.success("Python snippet copied to clipboard")
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-[#0a0c10] border-slate-800 text-slate-200 p-0 overflow-hidden rounded-2xl shadow-2xl shadow-purple-900/10">
                <div className="bg-gradient-to-br from-purple-900/30 via-slate-950 to-blue-900/20 px-8 pt-8 pb-6 border-b border-slate-800/50">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                <Terminal size={26} className="text-purple-400" />
                            </div>
                            <DialogTitle className="text-3xl font-bold text-white tracking-tight">API Access</DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-400 text-base">
                            Run your agentic flows externally with a simple HTTP request.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8">
                    {/* Credentials Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Key size={12} /> External API Key
                            </label>
                            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-3 rounded-xl hover:border-purple-500/30 transition-all group">
                                <input
                                    type={apiKeyVisible ? "text" : "password"}
                                    readOnly
                                    value={displayApiKey}
                                    className="bg-transparent text-sm font-mono text-purple-300 w-full outline-none"
                                />
                                <button onClick={() => setApiKeyVisible(!apiKeyVisible)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                                    {apiKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button onClick={() => handleCopy(displayApiKey, "API Key")} className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Hash size={12} /> Current Flow ID
                            </label>
                            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-3 rounded-xl hover:border-blue-500/30 transition-all group">
                                <input
                                    type="text"
                                    readOnly
                                    value={displayFlowId}
                                    className="bg-transparent text-sm font-mono text-blue-300 w-full outline-none truncate"
                                />
                                <button onClick={() => handleCopy(displayFlowId, "Flow ID")} className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors">
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Snippet Header */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 bg-slate-800 rounded-lg text-xs font-bold text-white border border-slate-700 flex items-center gap-2">
                                    <Code2 size={14} className="text-blue-400" />
                                    PYTHON 3.x
                                </div>
                            </div>
                            <Button
                                onClick={handleCopyMain}
                                className="bg-purple-600 hover:bg-purple-500 text-white gap-2 h-9 px-5 rounded-lg shadow-lg shadow-purple-900/20"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? "In Clipboard!" : "Copy Full Snippet"}
                            </Button>
                        </div>

                        {/* Code Block */}
                        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1117]">
                            <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-900/80 border-b border-slate-800">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/40"></div>
                                <span className="ml-2 text-[10px] text-slate-500 font-mono tracking-tighter uppercase">flow_execution.py</span>
                            </div>
                            <pre className="p-6 overflow-x-auto text-[13px] font-mono leading-relaxed text-slate-300 max-h-[400px] scrollbar-thin scrollbar-thumb-slate-800 custom-scrollbar">
                                <code>
                                    {pythonCode.split('\n').map((line, i) => (
                                        <div key={i} className="flex">
                                            <span className="inline-block w-8 text-slate-600 select-none opacity-50">{i + 1}</span>
                                            <span>{line || ' '}</span>
                                        </div>
                                    ))}
                                </code>
                            </pre>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="flex gap-4 p-5 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                        <div className="p-2 h-fit bg-purple-500/10 rounded-lg">
                            <Info size={18} className="text-purple-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-white">How it works</p>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Paste this code into your external Python application. The <code className="text-purple-400">x-api-key</code> ensures only you can run this flow. The <code className="text-blue-400">FLOW_ID</code> identifies the specific agentic structure you created.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
