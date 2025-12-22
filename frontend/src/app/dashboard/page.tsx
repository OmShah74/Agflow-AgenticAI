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
    useReactFlow,
    useOnSelectionChange
} from '@xyflow/react';
import * as ResizablePanels from 'react-resizable-panels';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { 
    LogOut, 
    Play, 
    Sparkles, 
    Box, 
    Bot, 
    Database, 
    ArrowLeft, 
    Save, 
    Download, 
    PanelRightClose, 
    PanelRightOpen, 
    Trash2, 
    Clock, 
    Search, 
    AlertTriangle, 
    FileText 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

// --- UI Components ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- Custom Components ---
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

// Placeholder for future components
const PlaceholderNode = ({ data }: any) => (
  <BaseNode title={data.label} color="slate">
    <div className="text-xs text-slate-500 p-2">Config coming soon.</div>
  </BaseNode>
);

export default function AgflowDashboard() {
  return (
    <ReactFlowProvider>
      <Toaster position="top-center" theme="dark" richColors />
      <DashboardInner />
    </ReactFlowProvider>
  );
}

function DashboardInner() {
  const router = useRouter();
  const supabase = createClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, toObject, deleteElements } = useReactFlow();

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  
  // View State
  const [view, setView] = useState<'templates' | 'canvas'>('templates');
  
  // React Flow State
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  // Playground / Execution State
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPlayground, setShowPlayground] = useState(true);

  // Persistence (Supabase) State
  const [flowName, setFlowName] = useState("Untitled Flow");
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [savedFlows, setSavedFlows] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [flowSearch, setFlowSearch] = useState("");

  // UI Dialog States
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // INITIALIZATION & DATA FETCHING
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
        } else {
            setUserId(user.id);
            loadSavedFlows(user.id);
        }
    };
    checkUser();
  }, [router, supabase]);

  const loadSavedFlows = async (uid: string) => {
      const { data } = await supabase
          .from('flows')
          .select('*')
          .eq('user_id', uid)
          .order('created_at', { ascending: false });
      
      if (data) setSavedFlows(data);
  };

  // ---------------------------------------------------------------------------
  // NODE CONFIGURATION
  // ---------------------------------------------------------------------------

  const nodeTypes = useMemo(() => ({
    // Core Logic
    agentNode: AgentNode as any,
    groqModel: GroqModelNode as any,
    openaiModel: GroqModelNode as any,
    
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

    // Placeholders
    ollamaModel: PlaceholderNode,
    fileLoader: PdfLoaderNode as any,
    textOutput: TextInputNode as any,
    calculator: PlaceholderNode,
    scraper: PlaceholderNode,
    embeddings: GroqModelNode as any,
    router: PlaceholderNode,
    crewAgent: PlaceholderNode,
  }), []);

  // ---------------------------------------------------------------------------
  // FLOW HANDLERS (Change, Connect, Drop)
  // ---------------------------------------------------------------------------

  const onNodeDataChange = useCallback((id: string, newData: any) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === id) {
          setIsUnsaved(true);
          return { ...node, data: { ...node.data, ...newData } };
      }
      return node;
    }));
  }, []);

  // Hydrate onChange handler for loaded nodes
  useEffect(() => {
    setNodes((nds) => nds.map(node => ({
        ...node,
        data: { ...node.data, onChange: onNodeDataChange }
    })));
  }, [onNodeDataChange]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      if (changes.some(c => c.type !== 'select')) setIsUnsaved(true);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      if (changes.some(c => c.type !== 'select')) setIsUnsaved(true);
  }, []);

  const onConnect = useCallback((params: Connection) => {
      setEdges((eds) => addEdge({ 
          ...params, 
          animated: true, 
          style: { stroke: '#a855f7', strokeWidth: 2 } 
      }, eds));
      setIsUnsaved(true);
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
      if (!type) return;

      const position = screenToFlowPosition({ 
          x: event.clientX, 
          y: event.clientY 
      });
      
      const newNode: Node = {
        id: Math.random().toString(),
        type,
        position,
        data: { label, onChange: onNodeDataChange },
      };
      
      setNodes((nds) => nds.concat(newNode));
      setIsUnsaved(true);
    },
    [screenToFlowPosition, onNodeDataChange]
  );

  // Track selection for delete button logic
  useOnSelectionChange({
    onChange: ({ nodes }) => {
        setSelectedNodes(nodes.map((node) => node.id));
    },
  });

  // ---------------------------------------------------------------------------
  // SAVE / LOAD / DELETE LOGIC
  // ---------------------------------------------------------------------------

  const handleSaveFlow = async (silent = false) => {
    if (!userId) return false;
    
    if (!silent) toast.loading("Saving flow...");
    
    const flowObject = toObject();
    const flowData = {
        user_id: userId,
        name: flowName,
        data: flowObject
    };

    let error;
    
    if (currentFlowId) {
        // Update existing flow
        const { error: err } = await supabase
            .from('flows')
            .update({ name: flowName, data: flowObject })
            .eq('id', currentFlowId);
        error = err;
    } else {
        // Create new flow
        const { data, error: err } = await supabase
            .from('flows')
            .insert(flowData)
            .select();
            
        if (data) setCurrentFlowId(data[0].id);
        error = err;
    }

    if (error) {
        toast.dismiss();
        toast.error("Failed to save flow.");
        return false;
    } else {
        setIsUnsaved(false);
        if (!silent) {
            toast.dismiss();
            toast.success("Flow saved successfully!");
        }
        loadSavedFlows(userId);
        return true;
    }
  };

  const handleLoadFlow = (flow: any) => {
      // Guard against unsaved changes
      handleProtectedAction(() => {
          setFlowName(flow.name);
          setCurrentFlowId(flow.id);
          
          const { nodes: savedNodes, edges: savedEdges } = flow.data;
          
          setNodes(savedNodes.map((n: any) => ({
              ...n,
              data: { ...n.data, onChange: onNodeDataChange }
          })));
          
          setEdges(savedEdges || []);
          setIsUnsaved(false);
          setView('canvas');
          toast.success(`Loaded "${flow.name}"`);
      });
  };

  // Logic to delete specific nodes from canvas
  const handleDeleteSelectedNodes = useCallback(() => {
      if (selectedNodes.length === 0) return;
      
      deleteElements({ nodes: selectedNodes.map(id => ({ id })) });
      setIsUnsaved(true);
      toast.info(`Deleted ${selectedNodes.length} node(s)`);
      
      const hasAgent = nodes.find(n => selectedNodes.includes(n.id) && n.type === 'agentNode');
      if (hasAgent) setChatResponse("");
      
      setSelectedNodes([]);
  }, [selectedNodes, deleteElements, nodes]);

  // Logic to delete a saved flow (DB)
  const confirmDeleteFlow = async () => {
      if (!flowToDelete) return;
      
      const id = flowToDelete;
      // Optimistic update
      const previousFlows = [...savedFlows];
      setSavedFlows(prev => prev.filter(flow => flow.id !== id));
      setFlowToDelete(null);

      try {
          const { error } = await supabase.from('flows').delete().eq('id', id);
          if (error) throw error;
          
          toast.success("Flow deleted successfully");

          // Reset if we deleted the current active flow
          if (currentFlowId === id) {
              setFlowName("Untitled Flow");
              setCurrentFlowId(null);
              setNodes([]);
              setEdges([]);
              setView('templates');
          }
      } catch (error) {
          console.error("Delete failed:", error);
          toast.error("Could not delete flow from database.");
          setSavedFlows(previousFlows); // Revert
      }
  };

  const handleDownloadJson = () => {
      const flowObject = toObject();
      const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
        JSON.stringify(flowObject, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `${flowName.replace(/\s+/g, '_')}.json`;
      link.click();
      toast.success("Flow exported to JSON");
  };

  // ---------------------------------------------------------------------------
  // UNSAVED CHANGES GUARD
  // ---------------------------------------------------------------------------

  const handleProtectedAction = (action: () => void) => {
      if (isUnsaved) {
          setPendingAction(() => action);
          setShowUnsavedDialog(true);
      } else {
          action();
      }
  };

  const confirmDiscard = () => {
      setShowUnsavedDialog(false);
      setIsUnsaved(false);
      if (pendingAction) pendingAction();
      setPendingAction(null);
  };

  const confirmSaveAndProceed = async () => {
      const success = await handleSaveFlow(true);
      if (success) {
          setShowUnsavedDialog(false);
          if (pendingAction) pendingAction();
          setPendingAction(null);
      }
  };

  // ---------------------------------------------------------------------------
  // EXECUTION LOGIC (Backend)
  // ---------------------------------------------------------------------------

  const runFlow = async () => {
    setLoading(true);
    setChatResponse("");
    
    const agentNode = nodes.find(n => n.type === 'agentNode');
    const modelNode = nodes.find(n => n.type === 'groqModel' || n.type === 'openaiModel');
    
    if (!agentNode && !modelNode) { 
        toast.error("Invalid Flow: Add an Agent or Model node."); 
        setLoading(false); return; 
    }

    let apiKey = "";
    if (modelNode) apiKey = (modelNode.data as any).apiKey;
    else if (agentNode) apiKey = (agentNode.data as any).groqApiKey || (agentNode.data as any).apiKey;

    if (!apiKey) { 
        toast.error("Missing API Key in Agent/Model node."); 
        setLoading(false); return; 
    }

    let openaiKey = undefined;
    if (apiKey.startsWith('sk-')) openaiKey = apiKey;
    else {
        const openaiNode = nodes.find(n => n.type === 'openaiModel' && (n.data as any).apiKey);
        if (openaiNode) openaiKey = (openaiNode.data as any).apiKey;
    }

    const payload = {
        nodes, 
        edges, 
        message: chatInput, 
        groq_api_key: apiKey, 
        openai_api_key: openaiKey
    };

    try {
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/run_flow`, payload);
        setChatResponse(res.data.response);
        toast.success("Execution successful");
    } catch (error) {
        console.error(error);
        setChatResponse("Error: Backend execution failed.");
        toast.error("Execution failed. Check backend logs.");
    }
    setLoading(false);
  };

  // ---------------------------------------------------------------------------
  // TEMPLATE LOGIC
  // ---------------------------------------------------------------------------

  const loadTemplate = (type: string) => {
     handleProtectedAction(() => {
         setFlowName(`${type.charAt(0).toUpperCase() + type.slice(1)} Template`);
         setCurrentFlowId(null);
         
         const commonData = { onChange: onNodeDataChange };
         
         if (type === 'blank') { 
             setNodes([]); 
             setEdges([]); 
         } 
         else if (type === 'simple') {
            setNodes([
                 { id: '1', type: 'agentNode', position: { x: 450, y: 150 }, data: { ...commonData } },
                 { id: '2', type: 'groqModel', position: { x: 100, y: 150 }, data: { ...commonData } }
            ]);
            setEdges([
                { id: 'e2-1', source: '2', target: '1', animated: true, style: { stroke: '#a855f7' } }
            ]);
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
         
         setIsUnsaved(true);
         setView('canvas');
         toast.success(`${type} template loaded`);
     });
  };

  const filteredFlows = savedFlows.filter(f => f.name.toLowerCase().includes(flowSearch.toLowerCase()));

  // ---------------------------------------------------------------------------
  // VIEW: TEMPLATES / LANDING
  // ---------------------------------------------------------------------------

  if (view === 'templates') {
      return (
        <div className="h-screen w-full bg-slate-950 flex overflow-hidden">
             
             {/* Left Panel: Saved Flows */}
             <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col z-20 shadow-xl">
                <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                    <h2 className="font-bold text-white flex items-center gap-2 mb-4">
                        <Database className="w-4 h-4 text-purple-400" /> Saved Projects
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input 
                            placeholder="Search flows..." 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:border-purple-500 outline-none transition-all"
                            value={flowSearch}
                            onChange={(e) => setFlowSearch(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {filteredFlows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                            <Box className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-xs">No saved flows.</p>
                        </div>
                    ) : (
                        filteredFlows.map(flow => (
                            <div 
                                key={flow.id} 
                                onClick={() => handleLoadFlow(flow)} 
                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700 cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded bg-slate-900 group-hover:bg-slate-700 flex items-center justify-center text-slate-400 border border-slate-800 transition-colors">
                                        <Clock size={14} />
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="text-sm text-slate-200 font-medium truncate">{flow.name}</span>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(flow.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setFlowToDelete(flow.id); }} 
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-800 bg-slate-900/30">
                    <button 
                        onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} 
                        className="flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-400 hover:text-white transition-colors border border-slate-800"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
             </div>

             {/* Right Panel: Templates Grid */}
             <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950">
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                 <div className="z-10 text-center max-w-5xl px-6 w-full">
                    <div className="flex flex-col items-center justify-center mb-10">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-900/50 mb-6 ring-4 ring-slate-900">
                            <Bot className="text-white w-9 h-9" />
                        </div>
                        <h1 className="text-5xl font-bold text-white tracking-tight mb-3">Agflow</h1>
                        <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                            Visual AI Agent Orchestration.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-4xl mx-auto">
                        <button onClick={() => loadTemplate('blank')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-purple-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-purple-900/10">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-900/30 transition-colors">
                                <Box className="text-purple-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Blank Canvas</h3>
                            <p className="text-xs text-slate-500">Start from scratch.</p>
                        </button>

                        <button onClick={() => loadTemplate('simple')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-green-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-green-900/10">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-900/30 transition-colors">
                                <Sparkles className="text-green-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Simple LLM</h3>
                            <p className="text-xs text-slate-500">Basic inference.</p>
                        </button>

                        <button onClick={() => loadTemplate('agentic')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-blue-900/10">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-900/30 transition-colors">
                                <Bot className="text-blue-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Agentic Flow</h3>
                            <p className="text-xs text-slate-500">Web Search + Tools.</p>
                        </button>

                        <button onClick={() => loadTemplate('rag')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-orange-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-orange-900/10">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-900/30 transition-colors">
                                <Database className="text-orange-400" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">RAG Pipeline</h3>
                            <p className="text-xs text-slate-500">PDF &rarr; Vector DB.</p>
                        </button>
                    </div>
                 </div>
             </div>
             
             {/* DIALOGS */}
             
             {/* 1. Unsaved Changes */}
             <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="text-yellow-500" /> Unsaved Changes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes in your current flow. What would you like to do?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)} className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-400">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDiscard} className="bg-red-900/50 text-red-200 hover:bg-red-900 border border-red-900">
                            Discard Changes
                        </AlertDialogAction>
                        <AlertDialogAction onClick={confirmSaveAndProceed} className="bg-purple-600 hover:bg-purple-700 text-white">
                            Save & Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>

             {/* 2. Delete Confirmation */}
             <AlertDialog open={!!flowToDelete} onOpenChange={(open) => !open && setFlowToDelete(null)}>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <Trash2 className="text-red-500" /> Delete Flow
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to permanently delete this flow? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setFlowToDelete(null)} className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-400">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteFlow} className="bg-red-600 hover:bg-red-700 text-white border-none">
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
             </AlertDialog>
        </div>
      )
  }

  // ---------------------------------------------------------------------------
  // VIEW: CANVAS / BUILDER
  // ---------------------------------------------------------------------------

  return (
    <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center px-4 justify-between z-50">
            <div className="flex items-center gap-3">
                 <button onClick={() => handleProtectedAction(() => setView('templates'))} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft size={16} />
                 </button>
                 <div className="h-6 w-[1px] bg-slate-800"></div>
                 <div className="flex items-center gap-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                    <FileText size={14} className="text-purple-500" />
                    <input 
                        value={flowName} 
                        onChange={(e) => { setFlowName(e.target.value); setIsUnsaved(true); }}
                        className="bg-transparent text-slate-200 font-medium text-sm focus:outline-none w-32 md:w-48 placeholder:text-slate-600"
                        placeholder="Name your flow..."
                    />
                    {isUnsaved && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Unsaved changes"></div>}
                 </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Delete Button for Selected Nodes */}
                {selectedNodes.length > 0 && (
                    <button 
                        onClick={handleDeleteSelectedNodes}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 text-xs font-medium rounded transition-all animate-in fade-in"
                    >
                        <Trash2 size={14} /> Delete ({selectedNodes.length})
                    </button>
                )}

                <KnowledgeBaseModal /> 
                
                <button onClick={() => handleSaveFlow()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded transition-all">
                    <Save size={14} /> Save
                </button>
                
                <button onClick={handleDownloadJson} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded transition-all">
                    <Download size={14} /> Export
                </button>
                
                <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
                
                <button 
                    onClick={() => setShowPlayground(!showPlayground)} 
                    className={`p-2 rounded transition-colors ${showPlayground ? 'text-purple-400 bg-purple-900/20 ring-1 ring-purple-500/50' : 'text-slate-400 hover:text-white'}`}
                    title="Toggle Playground"
                >
                    {showPlayground ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                </button>
            </div>
        </header>

        {/* Resizable Layout */}
        <div className="flex-1 overflow-hidden">
            <ResizablePanels.PanelGroup direction="horizontal">
                
                {/* Sidebar */}
                <ResizablePanels.Panel defaultSize={20} minSize={15} maxSize={30} className="bg-slate-950 border-r border-slate-800">
                    <Sidebar />
                </ResizablePanels.Panel>
                
                <ResizablePanels.PanelResizeHandle className="w-1 bg-slate-900 hover:bg-purple-600 transition-colors cursor-col-resize" />

                {/* Canvas */}
                <ResizablePanels.Panel minSize={30}>
                    <div className="w-full h-full relative bg-slate-900" ref={reactFlowWrapper}>
                        <ReactFlow
                            nodes={nodes} edges={edges}
                            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            deleteKeyCode={['Backspace', 'Delete']}
                            onDragOver={onDragOver} onDrop={onDrop}
                            nodeTypes={nodeTypes}
                            colorMode="dark"
                            fitView snapToGrid={true} snapGrid={[15, 15]}
                        >
                            <Background color="#1e293b" gap={20} size={1} />
                            <Controls className="bg-slate-800 border-slate-700 fill-slate-200" />
                        </ReactFlow>
                    </div>
                </ResizablePanels.Panel>

                {/* Playground */}
                {showPlayground && (
                    <>
                        <ResizablePanels.PanelResizeHandle className="w-1 bg-slate-900 hover:bg-purple-600 transition-colors cursor-col-resize" />
                        <ResizablePanels.Panel defaultSize={25} minSize={20} maxSize={40} className="bg-slate-950 border-l border-slate-800">
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm flex justify-between items-center">
                                    <h2 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                                        <Play className="w-4 h-4 text-green-500" /> Playground
                                    </h2>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50">
                                    {loading && (
                                        <div className="flex gap-3 animate-pulse">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 border border-slate-700" />
                                            <div className="space-y-2 w-full">
                                                <div className="bg-slate-800 h-4 w-3/4 rounded" />
                                                <div className="bg-slate-800 h-4 w-1/2 rounded" />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {!loading && !chatResponse && (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-3 opacity-50">
                                            <Sparkles className="w-8 h-8" />
                                            <p className="text-xs text-center px-10">
                                                Ready to test.
                                            </p>
                                        </div>
                                    )}

                                    {chatResponse && (
                                        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/30">
                                                <Bot className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl rounded-tl-none text-sm text-slate-300 leading-relaxed whitespace-pre-wrap shadow-sm">
                                                {chatResponse}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-4 bg-slate-900 border-t border-slate-800">
                                    <div className="relative">
                                        <textarea 
                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-12 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none h-24 custom-scrollbar transition-all placeholder:text-slate-600"
                                            placeholder="Type message..."
                                            value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runFlow(); } }}
                                        />
                                        <button 
                                            onClick={runFlow} disabled={loading}
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
                        </ResizablePanels.Panel>
                    </>
                )}
            </ResizablePanels.PanelGroup>

            {/* Unsaved Changes Dialog (Canvas) */}
            <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="text-yellow-500" /> Unsaved Changes
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes. What would you like to do?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)} className="bg-transparent border-slate-700 hover:bg-slate-800 text-slate-400">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDiscard} className="bg-red-900/50 text-red-200 hover:bg-red-900 border border-red-900">
                            Discard Changes
                        </AlertDialogAction>
                        <AlertDialogAction onClick={confirmSaveAndProceed} className="bg-purple-600 hover:bg-purple-700 text-white">
                            Save & Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}