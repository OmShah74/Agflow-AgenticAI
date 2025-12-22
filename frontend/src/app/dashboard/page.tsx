'use client'
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { 
    ReactFlow, 
    Background, 
    Controls, 
    addEdge, 
    applyNodeChanges, 
    applyEdgeChanges,
    Node,
    Edge,
    Connection,
    NodeChange,
    EdgeChange,
    ReactFlowProvider,
    useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { LogOut, Play, Sparkles, Box, Bot, Database, ArrowLeft, Trash2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

// --- UI Components ---
import Sidebar from '@/components/Sidebar';
import KnowledgeBaseModal from '@/components/KnowledgeBaseModal';
import BaseNode from '@/components/nodes/BaseNode';

// --- Node Components ---
import AgentNode from '@/components/nodes/AgentNode';
import GmailNode from '@/components/nodes/GmailNode';
import WebSearchNode from '@/components/nodes/WebSearchNode';
import GroqModelNode from '@/components/nodes/GroqModelNode';
import PdfLoaderNode from '@/components/nodes/PdfLoaderNode';
import VectorStoreNode from '@/components/nodes/VectorStoreNode';
import ChatInputNode from '@/components/nodes/ChatInputNode';
import ChatOutputNode from '@/components/nodes/ChatOutputNode';
import TextInputNode from '@/components/nodes/TextInputNode';
import PromptBuilderNode from '@/components/nodes/PromptBuilderNode';
import PromptTemplateNode from '@/components/nodes/PromptTemplateNode';
import TextSplitterNode from '@/components/nodes/TextSplitterNode';
import ChatMemoryNode from '@/components/nodes/ChatMemoryNode';
import HTMLRendererNode from '@/components/nodes/HTMLRendererNode';

// --- Placeholder for nodes still in development ---
const PlaceholderNode = ({ data }: any) => (
  <BaseNode title={data.label} color="slate">
    <div className="text-xs text-slate-500 p-2">
        Component configuration coming soon.
    </div>
  </BaseNode>
);

export default function AgflowDashboard() {
  return (
    <ReactFlowProvider>
      <DashboardInner />
    </ReactFlowProvider>
  );
}

function DashboardInner() {
  const router = useRouter();
  const supabase = createClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // --- State ---
  const [view, setView] = useState<'templates' | 'canvas'>('templates');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Node Types Configuration ---
  const nodeTypes = useMemo(() => ({
    // Core Logic
    agentNode: AgentNode as any,
    groqModel: GroqModelNode as any,
    openaiModel: GroqModelNode as any, // Reuse Groq UI
    
    // Tools
    gmailNode: GmailNode as any,
    webSearchNode: WebSearchNode as any,
    
    // RAG & Data
    pdfLoader: PdfLoaderNode as any,
    vectorStore: VectorStoreNode as any,
    textSplitter: TextSplitterNode as any,
    
    // Input / Output / Helpers
    chatInput: ChatInputNode as any,
    chatOutput: ChatOutputNode as any,
    textInput: TextInputNode as any,
    promptTemplate: PromptTemplateNode as any,
    promptBuilder: PromptBuilderNode as any,
    chatMemory: ChatMemoryNode as any,
    htmlRenderer: HTMLRendererNode as any,

    // Placeholders for future expansion
    ollamaModel: PlaceholderNode,
    fileLoader: PdfLoaderNode as any,
    textOutput: TextInputNode as any,
    calculator: PlaceholderNode,
    scraper: PlaceholderNode,
    embeddings: GroqModelNode as any,
    router: PlaceholderNode,
    crewAgent: PlaceholderNode,
  }), []);

  // --- Handlers ---

  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, ...newData } };
      }
      return node;
    }));
  }, []);

  useEffect(() => {
    setNodes((nds) => nds.map(node => ({
        ...node,
        data: { ...node.data, onChange: onNodeDataChange }
    })));
  }, [onNodeDataChange]);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const onConnect = useCallback((params: Connection) => {
      setEdges((eds) => addEdge({ 
          ...params, 
          animated: true, 
          style: { stroke: '#a855f7', strokeWidth: 2 } 
      }, eds));
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
      const hasAgent = deleted.some(n => n.type === 'agentNode');
      if (hasAgent) setChatResponse(""); 
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');

      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: Math.random().toString(),
        type,
        position,
        data: { label, onChange: onNodeDataChange },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, onNodeDataChange]
  );

  // --- Execution Logic ---

  const runFlow = async () => {
    setLoading(true);
    setChatResponse("");
    try {
        const agentNode = nodes.find(n => n.type === 'agentNode');
        const modelNode = nodes.find(n => n.type === 'groqModel' || n.type === 'openaiModel');
        
        if (!agentNode && !modelNode) { 
           alert("Invalid Flow: You need at least an 'Agno Agent' OR a 'Groq/OpenAI Model' node.");
           setLoading(false); return; 
        }

        let apiKey = "";
        if (modelNode) {
            const modelData = modelNode.data as Record<string, any>;
            apiKey = modelData.apiKey;
        } else if (agentNode) {
            const agentData = agentNode.data as Record<string, any>;
            apiKey = agentData.groqApiKey || agentData.apiKey;
        }

        if (!apiKey) {
            alert("Please enter an API Key in your Model or Agent node.");
            setLoading(false); return;
        }

        let openaiKey = undefined;
        if (apiKey.startsWith('sk-')) {
            openaiKey = apiKey;
        } else {
            const openaiNode = nodes.find(n => {
                const d = n.data as Record<string, any>;
                return n.type === 'openaiModel' && d.apiKey;
            });
            if (openaiNode) openaiKey = (openaiNode.data as Record<string, any>).apiKey;
        }

        const payload = {
            nodes: nodes,
            edges: edges,
            message: chatInput,
            groq_api_key: apiKey,
            openai_api_key: openaiKey
        };

        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/run_flow`, payload);
        setChatResponse(res.data.response);

    } catch (error) {
        console.error(error);
        setChatResponse("Error: Backend execution failed.");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // --- Template Loading ---
  const loadTemplate = (type: string) => {
     const commonData = { onChange: onNodeDataChange };
     if (type === 'blank') {
        setNodes([]); setEdges([]);
     } 
     else if (type === 'simple') {
        setNodes([
             { id: '1', type: 'agentNode', position: { x: 450, y: 150 }, data: { ...commonData } },
             { id: '2', type: 'groqModel', position: { x: 100, y: 150 }, data: { ...commonData } }
        ]);
        setEdges([{ id: 'e2-1', source: '2', target: '1', animated: true, style: { stroke: '#a855f7' } }]);
     } 
     else if (type === 'agentic') {
        setNodes([
             { id: '1', type: 'agentNode', position: { x: 500, y: 100 }, data: { ...commonData } },
             { id: '2', type: 'webSearchNode', position: { x: 100, y: 50 }, data: { ...commonData } },
             { id: '3', type: 'gmailNode', position: { x: 100, y: 250 }, data: { ...commonData } }
        ]);
        setEdges([
            { id: 'e2-1', source: '2', target: '1', animated: true, style: { stroke: '#a855f7' } },
            { id: 'e3-1', source: '3', target: '1', animated: true, style: { stroke: '#a855f7' } }
        ]);
     }
     else if (type === 'rag') {
         setNodes([
            { id: '1', type: 'pdfLoader', position: { x: 50, y: 50 }, data: { ...commonData } },
            { id: '2', type: 'textSplitter', position: { x: 300, y: 50 }, data: { ...commonData } },
            { id: '3', type: 'vectorStore', position: { x: 550, y: 50 }, data: { ...commonData } },
            { id: '4', type: 'agentNode', position: { x: 800, y: 150 }, data: { ...commonData } }
         ]);
         setEdges([
            { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#f97316' } }, 
            { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#f97316' } },
            { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#a855f7' } }
         ]);
     }
     setView('canvas');
  };

  // --- Views ---
  if (view === 'templates') {
      return (
          <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
             <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 opacity-90 z-0"></div>
             <div className="z-10 text-center max-w-5xl px-6 w-full">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/50">
                        <Bot className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-5xl font-bold text-white tracking-tight">Agflow</h1>
                </div>
                <p className="text-slate-400 mb-12 text-lg max-w-2xl mx-auto">
                    The open-source visual platform for building production-grade AI Agents, RAG pipelines, and automated workflows.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                    {/* Template Buttons */}
                    <button onClick={() => loadTemplate('blank')} className="group p-5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-purple-500 hover:bg-slate-800 transition-all text-left backdrop-blur-sm">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-900/30 transition-colors"><Box className="text-purple-400" /></div>
                        <h3 className="text-white font-semibold">Blank Canvas</h3><p className="text-xs text-slate-500 mt-2">Start from scratch.</p>
                    </button>
                    <button onClick={() => loadTemplate('simple')} className="group p-5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-green-500 hover:bg-slate-800 transition-all text-left backdrop-blur-sm">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-900/30 transition-colors"><Sparkles className="text-green-400" /></div>
                        <h3 className="text-white font-semibold">Simple LLM</h3><p className="text-xs text-slate-500 mt-2">Basic Groq inference.</p>
                    </button>
                    <button onClick={() => loadTemplate('agentic')} className="group p-5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500 hover:bg-slate-800 transition-all text-left backdrop-blur-sm">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-900/30 transition-colors"><Bot className="text-blue-400" /></div>
                        <h3 className="text-white font-semibold">Agentic</h3><p className="text-xs text-slate-500 mt-2">Web Search + Tools.</p>
                    </button>
                    <button onClick={() => loadTemplate('rag')} className="group p-5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-orange-500 hover:bg-slate-800 transition-all text-left backdrop-blur-sm">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-900/30 transition-colors"><Database className="text-orange-400" /></div>
                        <h3 className="text-white font-semibold">RAG Pipeline</h3><p className="text-xs text-slate-500 mt-2">PDF &rarr; Vector DB &rarr; Agent.</p>
                    </button>
                </div>
             </div>
             <button onClick={handleLogout} className="absolute top-6 right-6 text-slate-400 hover:text-white flex items-center gap-2 text-sm transition-colors">
                 <LogOut size={16} /> Sign Out
             </button>
          </div>
      )
  }

  // --- Main Canvas View ---
  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center px-4 justify-between z-50 shadow-sm">
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Bot className="text-white w-5 h-5" />
                 </div>
                <h1 className="font-bold text-lg text-slate-100 tracking-tight">Agflow</h1>
            </div>

            {/* Knowledge Base Button */}
            <div className="flex items-center gap-2">
                <KnowledgeBaseModal /> 
            </div>

            <div className="flex items-center gap-4">
                <button onClick={() => setView('templates')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <ArrowLeft size={14} /> Templates
                </button>
                <div className="h-4 w-[1px] bg-slate-800"></div>
                <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors">
                    <LogOut size={14} /> Logout
                </button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <Sidebar />

            <div className="flex-1 relative bg-slate-900" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodesDelete={onNodesDelete}
                    deleteKeyCode={['Backspace', 'Delete']}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    nodeTypes={nodeTypes}
                    colorMode="dark"
                    fitView
                    snapToGrid={true}
                    snapGrid={[15, 15]}
                >
                    <Background color="#1e293b" gap={20} size={1} />
                    <Controls className="bg-slate-800 border-slate-700 fill-slate-200" />
                </ReactFlow>
            </div>

            {/* Execution / Chat Panel */}
            <div className="w-96 bg-slate-950 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                    <h2 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                        <Play className="w-4 h-4 text-green-500" /> Playground
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {loading && (
                        <div className="flex gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                            <div className="space-y-2 w-full">
                                <div className="bg-slate-800 h-4 w-3/4 rounded" />
                                <div className="bg-slate-800 h-4 w-1/2 rounded" />
                            </div>
                        </div>
                    )}
                    
                    {!loading && !chatResponse && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-3 opacity-50">
                            <Sparkles className="w-10 h-10" />
                            <p className="text-xs text-center px-10">
                                Configure your flow, select a node, and hit <b>Backspace</b> to delete it.
                            </p>
                        </div>
                    )}

                    {chatResponse && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/50">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="text-xs text-slate-500 mb-1 ml-1">Agent Response</div>
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-none text-sm text-slate-300 leading-relaxed shadow-sm whitespace-pre-wrap">
                                    {chatResponse}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <div className="relative">
                        <textarea 
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-12 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none h-24 placeholder:text-slate-600 custom-scrollbar transition-all"
                            placeholder="Type your message here..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    runFlow();
                                }
                            }}
                        />
                        <button 
                            onClick={runFlow}
                            disabled={loading}
                            className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                                loading 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-purple-600 text-white hover:bg-purple-500 hover:scale-105 shadow-lg shadow-purple-900/20'
                            }`}
                        >
                            <Play size={16} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}