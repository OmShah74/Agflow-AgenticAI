'use client'

import React, {
    useState,
    useCallback,
    useEffect,
    useMemo,
    useRef
} from 'react';

// --- React Flow Imports ---
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
    useOnSelectionChange,
    Panel // Used for overlay controls if needed
} from '@xyflow/react';

// --- Resizable Panels ---
import * as ResizablePanels from 'react-resizable-panels';

// --- Styles ---
import '@xyflow/react/dist/style.css';

// --- Utilities ---
import axios from 'axios';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

// --- Icons ---
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
    FileText,
    Undo,
    Redo,
    Copy,
    AlertCircle,
    CheckCircle,
    PieChart
} from 'lucide-react';

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

// --- Custom App Components ---
import Sidebar from '@/components/Sidebar';
import KnowledgeBaseModal from '@/components/KnowledgeBaseModal';
import HeaderWidgets from '@/components/HeaderWidgets';
import LogsModal from '@/components/LogsModal';
import BaseNode from '@/components/nodes/BaseNode';


// --- Node Components ---
import AgentNode from '@/components/nodes/AgentNode';
import GmailNode from '@/components/nodes/GmailNode';
import WebSearchNode from '@/components/nodes/WebSearchNode';
import GroqModelNode from '@/components/nodes/GroqModelNode';
import OpenAIModelNode from '@/components/nodes/OpenAIModelNode';
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
import CustomComponentNode from '@/components/nodes/CustomComponentNode';
import DataVisualizationNode from '@/components/nodes/DataVisualizationNode';
import DataLoaderNode from '@/components/nodes/DataLoaderNode';
import { Dataset, ChartConfig } from '@/types/visualization';
import VisualizationDashboard from '@/components/visualization/VisualizationDashboard';
import DataInput from '@/components/visualization/DataInput';

// --- Placeholder for Future/WIP Nodes ---
const PlaceholderNode = ({ data }: any) => (
    <BaseNode title={data.label} color="slate">
        <div className="text-xs text-slate-500 p-2">
            Component configuration coming soon.
        </div>
    </BaseNode>
);

// --- TypeScript Interfaces ---
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isError?: boolean;
    chartConfig?: ChartConfig; // Optional chart config
    dataset?: Dataset; // Data for the chart
}

interface SavedFlow {
    id: string;
    name: string;
    data: any;
    user_id: string;
    created_at: string;
}

// ============================================================================
// MAIN COMPONENT WRAPPER
// ============================================================================
export default function AgflowDashboard() {
    return (
        <ReactFlowProvider>
            <Toaster position="top-center" theme="dark" richColors />
            <DashboardInner />
        </ReactFlowProvider>
    );
}

// ============================================================================
// DASHBOARD LOGIC
// ============================================================================
function DashboardInner() {
    const router = useRouter();
    const supabase = createClient();

    // Refs for DOM manipulation
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    // React Flow Hooks
    const {
        screenToFlowPosition,
        toObject,
        deleteElements,
        setNodes: setReactFlowNodes,
        setEdges: setReactFlowEdges,
        setViewport
    } = useReactFlow();

    // ---------------------------------------------------------------------------
    // STATE DEFINITIONS
    // ---------------------------------------------------------------------------

    // View State (Landing Page vs Builder)
    const [view, setView] = useState<'templates' | 'canvas'>('templates');

    // Graph Data
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<string[]>([]);

    // Undo/Redo History Stack
    const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Clipboard for Copy/Paste
    const [clipboard, setClipboard] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);

    // Chat & Execution State
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPlayground, setShowPlayground] = useState(true);

    // Persistence & Metadata
    const [flowName, setFlowName] = useState("Untitled Flow");
    const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
    const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [flowSearch, setFlowSearch] = useState("");
    const [currentDataset, setCurrentDataset] = useState<Dataset | null>(null);

    // Guard Rails (Unsaved Changes & Deletion)
    const [isUnsaved, setIsUnsaved] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [flowToDelete, setFlowToDelete] = useState<string | null>(null);

    // ---------------------------------------------------------------------------
    // EFFECT: AUTHENTICATION & INITIAL LOAD
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
        const { data, error } = await supabase
            .from('flows')
            .select('*')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error loading flows:", error);
        } else {
            setSavedFlows(data || []);
        }
    };

    // ---------------------------------------------------------------------------
    // EFFECT: HISTORY INITIALIZATION
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (historyIndex === -1 && nodes.length === 0 && edges.length === 0) {
            setHistory([{ nodes: [], edges: [] }]);
            setHistoryIndex(0);
        }
    }, []);

    // ---------------------------------------------------------------------------
    // EFFECT: CHAT AUTO-SCROLL
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatHistory, loading]);

    // ---------------------------------------------------------------------------
    // HELPER: CLEAN NODES (Remove Functions for Cloning)
    // ---------------------------------------------------------------------------
    const getCleanNodes = useCallback((nodesToClean: Node[]) => {
        return nodesToClean.map(node => {
            // Destructure to separate the function (onChange) from the rest of the data
            // functions cannot be structuredClone'd
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { onChange, ...serializableData } = node.data;

            return {
                ...node,
                data: serializableData // Clone only safe data
            };
        });
    }, []);

    // ---------------------------------------------------------------------------
    // HANDLER: SNAPSHOT FOR HISTORY
    // ---------------------------------------------------------------------------
    const takeSnapshot = useCallback(() => {
        const cleanNodes = getCleanNodes(nodes);
        const snapshot = {
            nodes: structuredClone(cleanNodes),
            edges: structuredClone(edges)
        };

        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            // Limit history stack size
            if (newHistory.length > 50) newHistory.shift();
            return [...newHistory, snapshot];
        });
        setHistoryIndex(prev => Math.min(prev + 1, 50));
        setIsUnsaved(true);
    }, [nodes, edges, historyIndex, getCleanNodes]);

    // ---------------------------------------------------------------------------
    // HANDLER: NODE DATA CHANGE
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

    // ---------------------------------------------------------------------------
    // ACTION: UNDO
    // ---------------------------------------------------------------------------
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const prevState = history[prevIndex];

            // Re-hydrate nodes with the onChange handler
            const hydratedNodes = prevState.nodes.map((n: any) => ({
                ...n,
                data: { ...n.data, onChange: onNodeDataChange }
            }));

            setNodes(hydratedNodes);
            setEdges(structuredClone(prevState.edges));
            setHistoryIndex(prevIndex);
            toast.info("Undo");
        }
    }, [history, historyIndex, onNodeDataChange]);

    // ---------------------------------------------------------------------------
    // ACTION: REDO
    // ---------------------------------------------------------------------------
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            const nextState = history[nextIndex];

            const hydratedNodes = nextState.nodes.map((n: any) => ({
                ...n,
                data: { ...n.data, onChange: onNodeDataChange }
            }));

            setNodes(hydratedNodes);
            setEdges(structuredClone(nextState.edges));
            setHistoryIndex(nextIndex);
            toast.info("Redo");
        }
    }, [history, historyIndex, onNodeDataChange]);

    // ---------------------------------------------------------------------------
    // ACTION: COPY
    // ---------------------------------------------------------------------------
    const copySelection = useCallback(() => {
        const nodesToCopy = nodes.filter(n => n.selected);
        if (nodesToCopy.length === 0) return;

        const selectedIds = new Set(nodesToCopy.map(n => n.id));
        // Only copy edges that connect two selected nodes
        const edgesToCopy = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));

        const cleanNodes = getCleanNodes(nodesToCopy);

        setClipboard({
            nodes: structuredClone(cleanNodes),
            edges: structuredClone(edgesToCopy)
        });
        toast.info(`Copied ${nodesToCopy.length} component(s)`);
    }, [nodes, edges, getCleanNodes]);

    // ---------------------------------------------------------------------------
    // ACTION: PASTE
    // ---------------------------------------------------------------------------
    const pasteSelection = useCallback(() => {
        if (!clipboard) return;

        const newNodes: Node[] = [];
        const idMap = new Map<string, string>();

        // 1. Recreate nodes with new IDs and slight offset
        clipboard.nodes.forEach(node => {
            const newId = Math.random().toString();
            idMap.set(node.id, newId);
            newNodes.push({
                ...node,
                id: newId,
                position: { x: node.position.x + 50, y: node.position.y + 50 },
                selected: true,
                data: { ...node.data, onChange: onNodeDataChange }
            });
        });

        // 2. Recreate edges with new IDs
        const newEdges: Edge[] = clipboard.edges.map(edge => ({
            ...edge,
            id: Math.random().toString(),
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
            selected: true
        }));

        // 3. Deselect current selection
        const currentNodesDeselected = nodes.map(n => ({ ...n, selected: false }));
        const currentEdgesDeselected = edges.map(e => ({ ...e, selected: false }));

        const finalNodes = [...currentNodesDeselected, ...newNodes];
        const finalEdges = [...currentEdgesDeselected, ...newEdges];

        setNodes(finalNodes);
        setEdges(finalEdges);

        // 4. Update History Manually
        const cleanFinalNodes = getCleanNodes(finalNodes);
        setHistory(prev => {
            const newH = prev.slice(0, historyIndex + 1);
            newH.push({
                nodes: structuredClone(cleanFinalNodes),
                edges: structuredClone(finalEdges)
            });
            return newH;
        });
        setHistoryIndex(prev => prev + 1);

        toast.success("Pasted successfully");
    }, [clipboard, nodes, edges, historyIndex, onNodeDataChange, getCleanNodes]);

    // ---------------------------------------------------------------------------
    // EFFECT: KEYBOARD SHORTCUTS
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (view !== 'canvas') return;

            // Prevent shortcuts if typing in an input
            const target = e.target as HTMLElement;
            const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
            const isContentEditable = target.isContentEditable;
            const isInsideDialog = target.closest('[role="dialog"]');

            if (isInput || isContentEditable || isInsideDialog) return;

            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
                e.preventDefault();
                redo();
            }
            // Copy: Ctrl+C
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copySelection();
            }
            // Paste: Ctrl+V
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                pasteSelection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [view, undo, redo, copySelection, pasteSelection]);

    // ---------------------------------------------------------------------------
    // MEMO: NODE TYPES REGISTRATION
    // ---------------------------------------------------------------------------
    const nodeTypes = useMemo(() => ({
        // Core
        agentNode: AgentNode as any,
        groqModel: GroqModelNode as any,
        openaiModel: OpenAIModelNode as any,

        // Tools
        gmailNode: GmailNode as any,
        webSearchNode: WebSearchNode as any,
        calculator: PlaceholderNode,
        scraper: PlaceholderNode,

        // RAG
        pdfLoader: PdfLoaderNode as any,
        vectorStore: VectorStoreNode as any,
        textSplitter: TextSplitterNode as any,
        embeddings: GroqModelNode as any, // Reuse basic input UI

        // I/O
        chatInput: ChatInputNode as any,
        chatOutput: ChatOutputNode as any,
        textInput: TextInputNode as any,
        textOutput: TextInputNode as any,

        // Logic
        promptTemplate: PromptTemplateNode as any,
        promptBuilder: PromptBuilderNode as any,
        router: PlaceholderNode,

        // Helpers
        chatMemory: ChatMemoryNode as any,
        htmlRenderer: HTMLRendererNode as any,
        customComponent: CustomComponentNode as any,
        dataVisualizationNode: DataVisualizationNode as any,
        dataLoaderNode: DataLoaderNode as any,
        // Misc
        ollamaModel: PlaceholderNode,
        fileLoader: PdfLoaderNode as any,
        crewAgent: PlaceholderNode,
    }), []);

    // ---------------------------------------------------------------------------
    // REACT FLOW: CHANGE HANDLERS
    // ---------------------------------------------------------------------------

    // Ensure nodes always have the data change handler attached
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
        setEdges((eds) => {
            const newEdges = addEdge({
                ...params,
                animated: true,
                style: { stroke: '#a855f7', strokeWidth: 2 }
            }, eds);

            // Delayed snapshot to ensure state is settled
            setTimeout(() => {
                setHistory(prev => {
                    return prev; // Force update if needed
                });
                // Ideally call snapshot here if possible, but async state makes it tricky
                // We rely on user interactions for snapshots usually
            }, 50);

            return newEdges;
        });
        setIsUnsaved(true);
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            // Case 1: Import JSON File
            if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                const file = event.dataTransfer.files[0];
                if (file.type !== "application/json" && !file.name.endsWith(".json")) {
                    toast.error("Invalid file. Please drop a .json file.");
                    return;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const flowData = JSON.parse(e.target?.result as string);
                        if (!flowData.nodes || !flowData.edges) throw new Error("Invalid structure");

                        const hydratedNodes = flowData.nodes.map((n: any) => ({
                            ...n,
                            data: { ...n.data, onChange: onNodeDataChange }
                        }));

                        setNodes(hydratedNodes);
                        setEdges(flowData.edges);

                        if (flowData.viewport) setViewport(flowData.viewport);

                        setFlowName(file.name.replace('.json', ''));
                        setCurrentFlowId(null);

                        // Reset history
                        const clean = getCleanNodes(hydratedNodes);
                        setHistory([{ nodes: clean, edges: flowData.edges }]);
                        setHistoryIndex(0);
                        setChatHistory([]);
                        setIsUnsaved(true);
                        toast.success(`Imported "${file.name}"`);
                    } catch (err) {
                        toast.error("Failed to parse flow file.");
                    }
                };
                reader.readAsText(file);
                return;
            }

            // Case 2: Drop Component from Sidebar
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
            takeSnapshot();
        },
        [screenToFlowPosition, onNodeDataChange, setViewport, takeSnapshot, getCleanNodes]
    );

    const onNodeDragStop = useCallback(() => {
        takeSnapshot();
    }, [takeSnapshot]);

    useOnSelectionChange({
        onChange: ({ nodes }) => {
            setSelectedNodes(nodes.map((node) => node.id));
        },
    });

    // ---------------------------------------------------------------------------
    // ACTION: DELETE SELECTION
    // ---------------------------------------------------------------------------
    const handleDeleteSelectedNodes = useCallback(() => {
        if (selectedNodes.length === 0) return;

        deleteElements({ nodes: selectedNodes.map(id => ({ id })) });
        setIsUnsaved(true);
        toast.info(`Deleted ${selectedNodes.length} node(s)`);

        const hasAgent = nodes.find(n => selectedNodes.includes(n.id) && n.type === 'agentNode');
        if (hasAgent) setChatHistory([]); // Clear chat if agent removed

        setSelectedNodes([]);
        setTimeout(takeSnapshot, 50);
    }, [selectedNodes, deleteElements, nodes, takeSnapshot]);

    // ---------------------------------------------------------------------------
    // ACTION: SAVE FLOW
    // ---------------------------------------------------------------------------
    const handleSaveFlow = async (silent = false) => {
        if (!userId) return false;
        if (!silent) toast.loading("Saving flow...");

        const flowObject = toObject();
        const flowData = { user_id: userId, name: flowName, data: flowObject };

        let error;
        if (currentFlowId) {
            const { error: err } = await supabase
                .from('flows')
                .update({ name: flowName, data: flowObject })
                .eq('id', currentFlowId);
            error = err;
        } else {
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

    // ---------------------------------------------------------------------------
    // ACTION: LOAD FLOW
    // ---------------------------------------------------------------------------
    const handleLoadFlow = (flow: any) => {
        handleProtectedAction(() => {
            setFlowName(flow.name);
            setCurrentFlowId(flow.id);

            const { nodes: savedNodes, edges: savedEdges, viewport } = flow.data;

            setNodes(savedNodes.map((n: any) => ({
                ...n,
                data: { ...n.data, onChange: onNodeDataChange }
            })));
            setEdges(savedEdges || []);

            if (viewport) setViewport(viewport);

            const clean = getCleanNodes(savedNodes);
            setHistory([{ nodes: clean, edges: savedEdges || [] }]);
            setHistoryIndex(0);
            setChatHistory([]); // Reset chat history on load

            setIsUnsaved(false);
            setView('canvas');
            toast.success(`Loaded "${flow.name}"`);
        });
    };

    // ---------------------------------------------------------------------------
    // ACTION: DELETE SAVED FLOW (DB)
    // ---------------------------------------------------------------------------
    const confirmDeleteFlow = async () => {
        if (!flowToDelete) return;
        const id = flowToDelete;
        const previousFlows = [...savedFlows];

        // Optimistic update
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
                setChatHistory([]);
                setView('templates');
            }
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Could not delete flow from database.");
            setSavedFlows(previousFlows);
        }
    };

    // ---------------------------------------------------------------------------
    // ACTION: EXPORT JSON
    // ---------------------------------------------------------------------------
    const handleDownloadJson = () => {
        const flowObject = toObject();
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(JSON.stringify(flowObject, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `${flowName.replace(/\s+/g, '_')}.json`;
        link.click();
        toast.success("Flow exported to JSON");
    };

    // ---------------------------------------------------------------------------
    // NAVIGATION GUARDS
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
    // EXECUTION LOGIC (Backend API)
    // ---------------------------------------------------------------------------
    const runFlow = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput;
        setChatInput(""); // Clear immediately
        setChatHistory(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
        setLoading(true);

        // Validate Graph Structure
        const agentNode = nodes.find(n => n.type === 'agentNode');
        const modelNode = nodes.find(n => n.type === 'groqModel' || n.type === 'openaiModel');
        const customNode = nodes.find(n => n.type === 'customComponent');
        const vizNode = nodes.find(n => n.type === 'dataVisualizationNode');

        if (!agentNode && !modelNode && !customNode && !vizNode) {
            toast.error("Invalid Flow: Add an Agent, Model, Data Visualizer, or Custom Component.");
            setLoading(false); return;
        }

        // Extract API Key
        let apiKey = "";
        if (modelNode) apiKey = (modelNode.data as any).apiKey;
        else if (agentNode) apiKey = (agentNode.data as any).groqApiKey || (agentNode.data as any).apiKey;
        else if (vizNode) apiKey = (vizNode.data as any).apiKey;

        // Only warn if not using pure custom component or visualizer (which can use env vars)
        if (!apiKey && !customNode && !vizNode) {
            toast.error("Missing API Key in Agent/Model node.");
            setLoading(false); return;
        }

        let openaiKey = undefined;
        if (apiKey && apiKey.startsWith('sk-')) openaiKey = apiKey;
        else {
            const openaiNode = nodes.find(n => n.type === 'openaiModel' && (n.data as any).apiKey);
            if (openaiNode) openaiKey = (openaiNode.data as any).apiKey;
        }

        // Resolve Dataset for Payload (Priority: State > Node)
        let payloadDataset = currentDataset;
        if (!payloadDataset) {
            const loaderNode = nodes.find(n => n.type === 'dataLoaderNode');
            if (loaderNode && (loaderNode.data as any).dataset) {
                payloadDataset = (loaderNode.data as any).dataset;
            }
        }

        const payload = {
            nodes,
            edges,
            message: userMessage,
            openai_api_key: openaiKey,
            // ... other keys if needed
            user_id: userId,
            flow_id: currentFlowId,
            dataset: payloadDataset
        };

        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/run_flow`, payload);
            const responseContent = res.data.response;

            // Parse Error Responses (JSON vs String)
            let isError = false;
            let finalContent = responseContent;

            if (typeof responseContent === 'string' && (responseContent.startsWith('Execution Error:') || responseContent.includes('"error":'))) {
                try {
                    const jsonPart = responseContent.replace("Execution Error:", "").trim();
                    const parsed = JSON.parse(jsonPart);
                    if (parsed.error) {
                        isError = true;
                        finalContent = `API Error: ${parsed.error.message || parsed.error.code}`;
                    }
                } catch (e) {
                    if (responseContent.toLowerCase().includes("error")) isError = true;
                }
            }


            let chartConfig: ChartConfig | undefined;
            let chartDataset: Dataset | undefined;

            // Try to detect chart config in response
            try {
                let parsed: any = null;

                if (typeof finalContent === 'object' && finalContent !== null) {
                    parsed = finalContent;
                } else if (typeof finalContent === 'string' && finalContent.trim().startsWith('{')) {
                    parsed = JSON.parse(finalContent);
                }

                if (parsed) {
                    // NEW: Structure { type: "chart_response", config: ..., dataset: ... }
                    if (parsed.type === 'chart_response' && parsed.config && parsed.dataset) {
                        chartConfig = parsed.config;
                        chartDataset = parsed.dataset;
                        finalContent = "Here is the visualization you requested:";
                    }
                    // FALLBACK: Just Config (Legacy/Raw LLM)
                    else if (parsed.type && ['bar', 'line', 'pie', 'scatter', 'radar', 'doughnut'].includes(parsed.type)) {
                        chartConfig = parsed;
                    }
                }
            } catch (e) {
                // Not a JSON chart
            }

            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: finalContent,
                timestamp: Date.now(),
                isError: isError,
                chartConfig: chartConfig,
                dataset: chartDataset
            }]);

        } catch (error) {
            console.error(error);
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: "Error: Backend execution failed. Check logs.",
                timestamp: Date.now(),
                isError: true
            }]);
            toast.error("Execution failed. Check backend logs.");
        }
        setLoading(false);
    };

    // ---------------------------------------------------------------------------
    // TEMPLATE LOADING
    // ---------------------------------------------------------------------------
    const loadTemplate = (type: string) => {
        handleProtectedAction(() => {
            setFlowName(`${type.charAt(0).toUpperCase() + type.slice(1)} Template`);
            setCurrentFlowId(null);
            const commonData = { onChange: onNodeDataChange };

            const resetState = (nds: Node[], eds: Edge[]) => {
                setNodes(nds);
                setEdges(eds);
                const clean = getCleanNodes(nds);
                setHistory([{ nodes: clean, edges: eds }]);
                setHistoryIndex(0);
                setChatHistory([]);
            };

            // --- TEMPLATES DEFINITION ---
            if (type === 'blank') {
                resetState([], []);
            }
            else if (type === 'simple') {
                const nds = [
                    { id: '1', type: 'agentNode', position: { x: 450, y: 150 }, data: { ...commonData } },
                    { id: '2', type: 'groqModel', position: { x: 100, y: 150 }, data: { ...commonData } }
                ];
                const eds = [{ id: 'e2-1', source: '2', target: '1', animated: true, style: { stroke: '#a855f7' } }];
                resetState(nds, eds);
            }
            else if (type === 'agentic') {
                const nds = [
                    { id: '1', type: 'agentNode', position: { x: 500, y: 100 }, data: { ...commonData } },
                    { id: '2', type: 'webSearchNode', position: { x: 100, y: 50 }, data: { ...commonData } },
                    { id: '3', type: 'gmailNode', position: { x: 100, y: 250 }, data: { ...commonData } }
                ];
                const eds = [
                    { id: 'e2-1', source: '2', target: '1', animated: true, style: { stroke: '#a855f7' } },
                    { id: 'e3-1', source: '3', target: '1', animated: true, style: { stroke: '#a855f7' } }
                ];
                resetState(nds, eds);
            }
            else if (type === 'rag') {
                const nds = [
                    { id: '1', type: 'pdfLoader', position: { x: 50, y: 50 }, data: { ...commonData } },
                    { id: '2', type: 'textSplitter', position: { x: 300, y: 50 }, data: { ...commonData } },
                    { id: '3', type: 'vectorStore', position: { x: 550, y: 50 }, data: { ...commonData } },
                    { id: '4', type: 'agentNode', position: { x: 800, y: 150 }, data: { ...commonData } }
                ];
                const eds = [
                    { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#f97316' } },
                    { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#f97316' } },
                    { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#a855f7' } }
                ];
                resetState(nds, eds);
            }
            else if (type === 'visualization') {
                const nds = [
                    { id: '1', type: 'dataLoaderNode', position: { x: 100, y: 150 }, data: { ...commonData } },
                    { id: '2', type: 'groqModel', position: { x: 100, y: 400 }, data: { ...commonData, model: 'llama-3.3-70b-versatile' } },
                    { id: '3', type: 'dataVisualizationNode', position: { x: 500, y: 250 }, data: { ...commonData } }
                ];
                const eds = [
                    { id: 'e1-3', source: '1', sourceHandle: 'data', target: '3', targetHandle: 'dataSource', animated: true, style: { stroke: '#a855f7' } },
                    { id: 'e2-3', source: '2', sourceHandle: 'output', target: '3', targetHandle: 'modelInput', animated: true, style: { stroke: '#a855f7' } }
                ];
                resetState(nds, eds);
            }

            setIsUnsaved(true);
            setView('canvas');
            toast.success(`${type} template loaded`);
        });
    };

    const filteredFlows = savedFlows.filter(f => f.name.toLowerCase().includes(flowSearch.toLowerCase()));

    // ============================================================================
    // RENDER: TEMPLATES VIEW
    // ============================================================================
    if (view === 'templates') {
        return (
            <div className="h-screen w-full bg-slate-950 flex overflow-hidden">
                {/* Left Panel: Saved Flows */}
                <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl">
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
                                suppressHydrationWarning
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
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFlowToDelete(flow.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-all"
                                        suppressHydrationWarning
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
                            suppressHydrationWarning
                        >
                            <LogOut size={14} /> Sign Out
                        </button>
                    </div>
                </div>

                {/* Right Panel: Templates */}
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
                            <button onClick={() => loadTemplate('blank')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-purple-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-purple-900/10" suppressHydrationWarning>
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-900/30 transition-colors">
                                    <Box className="text-purple-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-1">Blank Canvas</h3>
                                <p className="text-xs text-slate-500">Start from scratch.</p>
                            </button>

                            <button onClick={() => loadTemplate('simple')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-green-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-green-900/10" suppressHydrationWarning>
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-900/30 transition-colors">
                                    <Sparkles className="text-green-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-1">Simple LLM</h3>
                                <p className="text-xs text-slate-500">Basic inference.</p>
                            </button>

                            <button onClick={() => loadTemplate('agentic')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-blue-900/10" suppressHydrationWarning>
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-900/30 transition-colors">
                                    <Bot className="text-blue-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-1">Agentic Flow</h3>
                                <p className="text-xs text-slate-500">Web Search + Tools.</p>
                            </button>

                            <button onClick={() => loadTemplate('rag')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-orange-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-orange-900/10" suppressHydrationWarning>
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-900/30 transition-colors">
                                    <Database className="text-orange-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-1">RAG Pipeline</h3>
                                <p className="text-xs text-slate-500">PDF &rarr; Vector DB.</p>
                            </button>

                            <button onClick={() => loadTemplate('visualization')} className="group p-6 bg-slate-900/40 border border-slate-800 rounded-2xl hover:border-pink-500/50 hover:bg-slate-800/60 transition-all text-left backdrop-blur-sm shadow-sm hover:shadow-pink-900/10" suppressHydrationWarning>
                                <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-900/30 transition-colors">
                                    <PieChart className="text-pink-400" />
                                </div>
                                <h3 className="text-white font-semibold mb-1">Data Visualizer</h3>
                                <p className="text-xs text-slate-500">CSV &rarr; Charts.</p>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
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

                {/* Unsaved Changes Dialog (Templates) */}
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
                                Discard
                            </AlertDialogAction>
                            <AlertDialogAction onClick={confirmSaveAndProceed} className="bg-purple-600 hover:bg-purple-700 text-white">
                                Save & Continue
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    // ============================================================================
    // RENDER: CANVAS VIEW
    // ============================================================================
    return (
        <div className="h-screen w-full flex flex-col bg-slate-950 overflow-hidden relative">
            {/* Floating Logs Button */}
            {view === 'canvas' && <LogsModal />}

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
                            suppressHydrationWarning
                        />
                        {isUnsaved && <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Unsaved changes"></div>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <HeaderWidgets />

                    {/* Undo/Redo Buttons */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 mr-2">
                        <button
                            onClick={undo}
                            disabled={historyIndex === 0}
                            className={`p-1.5 rounded transition-colors ${historyIndex === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo size={14} />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className={`p-1.5 rounded transition-colors ${historyIndex >= history.length - 1 ? 'text-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo size={14} />
                        </button>
                    </div>

                    {/* Conditional Delete Button */}
                    {selectedNodes.length > 0 && (
                        <button
                            onClick={handleDeleteSelectedNodes}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 text-red-400 text-xs font-medium rounded transition-all animate-in fade-in"
                            suppressHydrationWarning
                        >
                            <Trash2 size={14} /> Delete ({selectedNodes.length})
                        </button>
                    )}

                    <KnowledgeBaseModal />

                    <button onClick={() => handleSaveFlow()} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded transition-all" suppressHydrationWarning>
                        <Save size={14} /> Save
                    </button>

                    <button onClick={handleDownloadJson} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium rounded transition-all" suppressHydrationWarning>
                        <Download size={14} /> Export
                    </button>

                    <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>

                    <button
                        onClick={() => setShowPlayground(!showPlayground)}
                        className={`p-2 rounded transition-colors ${showPlayground ? 'text-purple-400 bg-purple-900/20 ring-1 ring-purple-500/50' : 'text-slate-400 hover:text-white'}`}
                        title="Toggle Playground"
                        suppressHydrationWarning
                    >
                        {showPlayground ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
                    </button>
                </div>
            </header>

            {/* Resizable Panels */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanels.PanelGroup direction="horizontal">

                    {/* 1. Sidebar */}
                    <ResizablePanels.Panel defaultSize={20} minSize={15} maxSize={30} className="bg-slate-950 border-r border-slate-800">
                        <Sidebar />
                    </ResizablePanels.Panel>

                    <ResizablePanels.PanelResizeHandle className="w-1 bg-slate-900 hover:bg-purple-600 transition-colors cursor-col-resize" />

                    {/* 2. Canvas */}
                    <ResizablePanels.Panel minSize={30}>
                        <div className="w-full h-full relative bg-slate-900" ref={reactFlowWrapper}>
                            <ReactFlow
                                nodes={nodes} edges={edges}
                                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeDragStop={onNodeDragStop}
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

                    {/* 3. Playground */}
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

                                    {/* Chat History Area */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/50 flex flex-col" ref={chatScrollRef}>

                                        {chatHistory.length === 0 && (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-3 opacity-50 min-h-[100px]">
                                                <Sparkles className="w-8 h-8" />
                                                <p className="text-xs text-center px-10">
                                                    Ready to test.
                                                </p>
                                            </div>
                                        )}

                                        {chatHistory.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                                    ? 'bg-purple-600 text-white rounded-br-none'
                                                    : msg.isError
                                                        ? 'bg-red-900/20 border border-red-900 text-red-200 rounded-bl-none'
                                                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                                                    }`}>
                                                    {msg.role === 'assistant' && (
                                                        <div className="flex items-center gap-2 mb-2 opacity-50 text-[10px] uppercase font-bold tracking-wider">
                                                            {msg.isError ? <AlertCircle size={10} className="text-red-400" /> : <Bot size={10} />}
                                                            {msg.isError ? "Error" : "Agent"}
                                                        </div>
                                                    )}
                                                    {msg.chartConfig && (
                                                        <div className="w-full mt-2 min-w-[300px]">
                                                            <VisualizationDashboard
                                                                dataset={msg.dataset || currentDataset}
                                                                suggestedCharts={[msg.chartConfig]}
                                                            />
                                                        </div>
                                                    )}
                                                    {!msg.chartConfig && (
                                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {loading && (
                                            <div className="flex justify-start">
                                                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                                                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <div className="p-4 bg-slate-900 border-t border-slate-800">
                                        <div className="relative">
                                            <textarea
                                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pr-12 text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none h-24 custom-scrollbar transition-all placeholder:text-slate-600"
                                                placeholder="Type message..."
                                                value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runFlow(); } }}
                                                suppressHydrationWarning
                                            />
                                            <button
                                                onClick={runFlow} disabled={loading}
                                                className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all duration-200 ${loading
                                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                                    : 'bg-purple-600 text-white hover:bg-purple-500 hover:scale-105 shadow-lg shadow-purple-900/20'
                                                    }`}
                                                suppressHydrationWarning
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
            </div>
        </div>
    );
}