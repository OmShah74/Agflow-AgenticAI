import React, { useState } from 'react';
import { 
  MessageSquare, FileText, Database, Bot, Wrench, 
  Cpu, Layers, Globe, Mail, Code, Terminal, Search, Box, Scissors, BrainCircuit
} from 'lucide-react';

// Categories Configuration
export const nodeCategories = {
  'Inputs / Outputs': [
    { type: 'chatInput', label: 'Chat Input', icon: MessageSquare, desc: "User entry" },
    { type: 'chatOutput', label: 'Chat Output', icon: MessageSquare, desc: "Display result" },
  ],
  'Prompts': [
    { type: 'promptTemplate', label: 'Prompt Template', icon: FileText, desc: "Dynamic variables" },
    { type: 'promptBuilder', label: 'Prompt Builder', icon: Code, desc: "Visual builder" },
  ],
  'Models': [
    { type: 'groqModel', label: 'Groq', icon: Cpu, desc: "Llama 3, Mixtral" },
    { type: 'openaiModel', label: 'OpenAI', icon: Cpu, desc: "GPT-4o" },
  ],
  'Agents': [
    { type: 'agentNode', label: 'Agno Agent', icon: Bot, desc: "Orchestrator" },
  ],
  'Tools': [
    { type: 'webSearchNode', label: 'DuckDuckGo', icon: Globe, desc: "Search engine" },
    { type: 'gmailNode', label: 'Gmail', icon: Mail, desc: "Email client" },
  ],
  'Data / RAG': [
    { type: 'pdfLoader', label: 'PDF Loader', icon: FileText, desc: "Parse PDF" },
    { type: 'textSplitter', label: 'Text Splitter', icon: Scissors, desc: "Chunk documents" },
    { type: 'vectorStore', label: 'Supabase Vector', icon: Database, desc: "Knowledge Base" },
  ],
  'Helpers': [
    { type: 'customComponent', label: 'Custom Component', icon: Code, desc: "Python Script" },
    { type: 'chatMemory', label: 'Chat Memory', icon: BrainCircuit, desc: "Session history" },
    { type: 'htmlRenderer', label: 'HTML Renderer', icon: Code, desc: "Visualize HTML" },
  ]
};

export default function Sidebar() {
  const [searchTerm, setSearchTerm] = useState("");

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const filteredCategories = Object.entries(nodeCategories).reduce((acc, [key, nodes]) => {
    const filteredNodes = nodes.filter(node => 
      node.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredNodes.length > 0) acc[key] = filteredNodes;
    return acc;
  }, {} as any);

  return (
    // REMOVED fixed width, added h-full and w-full
    <aside className="h-full w-full bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-4">
            <Box className="w-5 h-5 text-purple-500" />
            <span className="font-bold text-slate-200">Components</span>
        </div>
        <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input 
                type="text"
                placeholder="Search..."
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:border-purple-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {Object.entries(filteredCategories).map(([category, nodes]: any) => (
            <div key={category}>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3 px-1 tracking-wider">
                {category}
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                {nodes.map((node: any) => (
                    <div
                    key={node.type}
                    onDragStart={(event) => onDragStart(event, node.type, node.label)}
                    draggable
                    className="flex flex-col gap-2 p-3 rounded-xl cursor-grab bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800 transition-all group shadow-sm"
                    >
                        <div className="flex items-center justify-between">
                             <node.icon className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
                        </div>
                        <div>
                            <span className="text-xs font-medium text-slate-200 block">{node.label}</span>
                            <span className="text-[10px] text-slate-500 line-clamp-1">{node.desc}</span>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        ))}
      </div>
    </aside>
  );
}