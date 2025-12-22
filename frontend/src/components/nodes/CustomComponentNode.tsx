import React, { useState, useEffect, useCallback } from 'react';
import { NodeProps, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';
import { 
    Code, Save, Layers, Box, BookOpen, Copy, Check, 
    Maximize2, Minimize2, Terminal, Cpu, Globe, Database, Wrench, Variable 
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { NodeCard, NodeHeader, NodeField } from './NodeComponents';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog"; 
import { Button } from "@/components/ui/button";
import { 
    Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- DATA: 25+ EXAMPLES ---
const EXAMPLE_CATEGORIES = [
    {
        id: "basics",
        icon: Variable,
        title: "Fundamentals & Logic",
        examples: [
            { title: "Hello World", code: `class CustomComponent:\n    def build(self, name: str) -> str:\n        return f"Hello, {name}!"` },
            { title: "String Reverser", code: `class CustomComponent:\n    def build(self, text: str) -> str:\n        return text[::-1]` },
            { title: "Word Counter", code: `class CustomComponent:\n    def build(self, text: str) -> str:\n        count = len(text.split())\n        return f"Word count: {count}"` },
            { title: "Simple Math (Add)", code: `class CustomComponent:\n    def build(self, a: str, b: str) -> str:\n        # Inputs are always strings from the UI\n        result = float(a) + float(b)\n        return str(result)` },
            { title: "Even or Odd", code: `class CustomComponent:\n    def build(self, number: str) -> str:\n        num = int(number)\n        return "Even" if num % 2 == 0 else "Odd"` },
            { title: "JSON Parser", code: `import json\n\nclass CustomComponent:\n    def build(self, json_str: str) -> str:\n        try:\n            data = json.loads(json_str)\n            return str(data.get('key', 'Not found'))\n        except:\n            return "Invalid JSON"` },
        ]
    },
    {
        id: "agno",
        icon: Cpu,
        title: "Agno Agents (AI)",
        examples: [
            { title: "Basic Chat Agent", code: `from agno.agent import Agent\nfrom agno.models.groq import Groq\n\nclass CustomComponent:\n    def build(self, prompt: str, api_key: str) -> str:\n        agent = Agent(\n            model=Groq(id="llama-3.3-70b-versatile", api_key=api_key),\n            markdown=True\n        )\n        return agent.run(prompt).content` },
            { title: "Pirate Persona", code: `from agno.agent import Agent\nfrom agno.models.groq import Groq\n\nclass CustomComponent:\n    def build(self, prompt: str, api_key: str) -> str:\n        agent = Agent(\n            model=Groq(id="llama-3.3-70b-versatile", api_key=api_key),\n            description="You are a pirate captain.",\n            instructions="Speak like a pirate."\n        )\n        return agent.run(prompt).content` },
            { title: "JSON Output Agent", code: `from agno.agent import Agent\nfrom agno.models.groq import Groq\n\nclass CustomComponent:\n    def build(self, prompt: str, api_key: str) -> str:\n        agent = Agent(\n            model=Groq(id="llama-3.3-70b-versatile", api_key=api_key),\n            description="Return JSON only."\n        )\n        return agent.run(f"{prompt} as JSON").content` },
            { title: "Translator Agent", code: `from agno.agent import Agent\nfrom agno.models.groq import Groq\n\nclass CustomComponent:\n    def build(self, text: str, lang: str, api_key: str) -> str:\n        agent = Agent(model=Groq(id="llama-3.3-70b-versatile", api_key=api_key))\n        return agent.run(f"Translate to {lang}: {text}").content` },
            { title: "Code Generator", code: `from agno.agent import Agent\nfrom agno.models.groq import Groq\n\nclass CustomComponent:\n    def build(self, task: str, api_key: str) -> str:\n        agent = Agent(\n            model=Groq(id="llama-3.3-70b-versatile", api_key=api_key),\n            description="You are a Python expert. Output code only."\n        )\n        return agent.run(task).content` },
        ]
    },
    {
        id: "web",
        icon: Globe,
        title: "Web & Networking",
        examples: [
            { title: "Simple GET Request", code: `import requests\n\nclass CustomComponent:\n    def build(self, url: str) -> str:\n        res = requests.get(url)\n        return res.text[:500]  # Return first 500 chars` },
            { title: "API Status Checker", code: `import requests\n\nclass CustomComponent:\n    def build(self, url: str) -> str:\n        try:\n            code = requests.get(url).status_code\n            return f"Status: {code}"\n        except:\n            return "Failed to connect"` },
            { title: "Fetch JSON Data", code: `import requests\n\nclass CustomComponent:\n    def build(self, api_url: str) -> str:\n        res = requests.get(api_url)\n        return str(res.json())` },
            { title: "URL Builder", code: `import urllib.parse\n\nclass CustomComponent:\n    def build(self, base: str, query: str) -> str:\n        return f"{base}?q={urllib.parse.quote(query)}"` },
        ]
    },
    {
        id: "data",
        icon: Database,
        title: "Data Processing",
        examples: [
            { title: "Extract Emails (Regex)", code: `import re\n\nclass CustomComponent:\n    def build(self, text: str) -> str:\n        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', text)\n        return ", ".join(emails)` },
            { title: "CSV Line Parser", code: `class CustomComponent:\n    def build(self, csv_line: str) -> str:\n        # Simple split\n        cols = csv_line.split(',')\n        return f"Columns: {len(cols)}"` },
            { title: "List Deduplicator", code: `class CustomComponent:\n    def build(self, comma_sep_list: str) -> str:\n        items = [x.strip() for x in comma_sep_list.split(',')]\n        unique = list(set(items))\n        return ", ".join(unique)` },
            { title: "Text Truncator", code: `class CustomComponent:\n    def build(self, text: str, max_len: str) -> str:\n        limit = int(max_len)\n        return text[:limit] + "..." if len(text) > limit else text` },
        ]
    },
    {
        id: "utils",
        icon: Wrench,
        title: "Utilities",
        examples: [
            { title: "UUID Generator", code: `import uuid\n\nclass CustomComponent:\n    def build(self, _unused: str) -> str:\n        return str(uuid.uuid4())` },
            { title: "SHA256 Hash", code: `import hashlib\n\nclass CustomComponent:\n    def build(self, text: str) -> str:\n        return hashlib.sha256(text.encode()).hexdigest()` },
            { title: "Current Timestamp", code: `from datetime import datetime\n\nclass CustomComponent:\n    def build(self, _unused: str) -> str:\n        return datetime.now().isoformat()` },
            { title: "Random Number", code: `import random\n\nclass CustomComponent:\n    def build(self, min_val: str, max_val: str) -> str:\n        return str(random.randint(int(min_val), int(max_val)))` },
            { title: "Base64 Encoder", code: `import base64\n\nclass CustomComponent:\n    def build(self, text: str) -> str:\n        return base64.b64encode(text.encode()).decode()` },
        ]
    }
];

const DEFAULT_CODE = `from agno.agent import Agent
from agno.models.groq import Groq

class CustomComponent:
    def build(self, prompt: str, api_key: str) -> str:
        # Initialize a dedicated agent
        agent = Agent(
            model=Groq(id="llama-3.3-70b-versatile", api_key=api_key),
            markdown=True
        )
        response = agent.run(prompt)
        return response.content
`;

// Helper for Copy Code Button
const CopyButton = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Snippet copied!");
    };
    return (
        <button onClick={handleCopy} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded border border-slate-700">
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
        </button>
    );
};

export default function CustomComponentNode({ data, id, selected }: NodeProps<any>) {
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [code, setCode] = useState(data.code || DEFAULT_CODE);
  const [inputs, setInputs] = useState<string[]>(data.detectedInputs || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Improved Regex Parser for Python Signatures
  const parseInputs = useCallback((codeString: string) => {
    try {
        const regex = /def\s+build\s*\(\s*self\s*,?\s*([\s\S]*?)\)\s*(?:->.*?)?:/;
        const match = codeString.match(regex);

        if (match && match[1]) {
            const rawArgs = match[1].split(',');
            return rawArgs
                .map(arg => {
                    let cleanArg = arg.trim();
                    if (cleanArg.includes(':')) cleanArg = cleanArg.split(':')[0].trim();
                    if (cleanArg.includes('=')) cleanArg = cleanArg.split('=')[0].trim();
                    return cleanArg;
                })
                .filter(arg => arg && arg !== 'self' && !arg.startsWith('#'));
        }
        return [];
    } catch (e) {
        console.error("Parse error:", e);
        return [];
    }
  }, []);

  const handleSaveCode = () => {
      const detectedInputs = parseInputs(code);
      setInputs(detectedInputs);
      
      setNodes((nds) => nds.map((node) => {
          if (node.id === id) {
              return { 
                  ...node, 
                  data: { ...node.data, code: code, detectedInputs: detectedInputs } 
              };
          }
          return node;
      }));
      
      setTimeout(() => updateNodeInternals(id), 0);
      
      if (detectedInputs.length > 0) toast.success(`Compiled: ${detectedInputs.length} inputs detected.`);
      else toast.warning("No inputs detected. Check build() signature.");
      
      setIsDialogOpen(false);
  };

  useEffect(() => {
      if (!data.detectedInputs) {
          const detected = parseInputs(code);
          if (detected.length > 0) {
              setInputs(detected);
              setTimeout(() => updateNodeInternals(id), 100);
          }
      }
  }, [data.detectedInputs, code, parseInputs, id, updateNodeInternals]);

  return (
    <NodeCard selected={selected}>
      <NodeHeader icon={Layers} title="Custom Python" color="purple" badge="Script" />
      
      <div className="p-3 border-b border-slate-800 bg-slate-900/30">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-8 bg-slate-900 border-slate-700 text-xs text-slate-300 hover:text-white hover:border-purple-500/50 transition-all flex items-center justify-center gap-2 group">
                      <Code className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" /> 
                      Edit Code
                  </Button>
              </DialogTrigger>
              
              <DialogContent className={cn(
                  "bg-slate-950 border-slate-800 flex flex-col p-0 gap-0 shadow-2xl focus:outline-none transition-all duration-300",
                  isMaximized ? "w-[100vw] h-[100vh] max-w-none rounded-none border-0" : "max-w-5xl h-[85vh] rounded-xl border"
              )}>
                  {/* Header */}
                  <DialogHeader className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex-row items-center justify-between space-y-0 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                              <Box className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                              <DialogTitle className="text-slate-100 text-base font-bold tracking-tight">Component Editor</DialogTitle>
                              <p className="text-[11px] text-slate-500 font-medium">Define logic in Python &middot; Inputs are auto-detected</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3 mr-8">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={() => setIsMaximized(!isMaximized)}
                            title={isMaximized ? "Restore" : "Maximize"}
                          >
                              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                          </Button>
                          <Button size="sm" onClick={handleSaveCode} className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs px-4 font-medium shadow-lg shadow-purple-900/20 transition-all">
                              <Save className="w-3.5 h-3.5 mr-2" /> Save & Compile
                          </Button>
                      </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-hidden bg-[#1e1e1e] flex flex-col">
                      <Tabs defaultValue="editor" className="h-full flex flex-col">
                          <div className="bg-slate-900 border-b border-slate-800 px-4 shrink-0">
                              <TabsList className="bg-transparent h-10 p-0 gap-6 w-full justify-start">
                                  <TabsTrigger value="editor" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none h-full px-2 text-slate-400 data-[state=active]:text-purple-400 text-xs font-semibold tracking-wider flex items-center gap-2">
                                      <Code size={14} /> CODE EDITOR
                                  </TabsTrigger>
                                  <TabsTrigger value="guide" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full px-2 text-slate-400 data-[state=active]:text-blue-400 text-xs font-semibold tracking-wider flex items-center gap-2">
                                      <BookOpen size={14} /> EXAMPLES & DOCS
                                  </TabsTrigger>
                              </TabsList>
                          </div>

                          {/* EDITOR TAB */}
                          <TabsContent value="editor" className="flex-1 h-full m-0 p-0 relative">
                              <Editor
                                  height="100%"
                                  defaultLanguage="python"
                                  theme="vs-dark"
                                  value={code}
                                  onChange={(value) => setCode(value || "")}
                                  options={{
                                      minimap: { enabled: false },
                                      fontSize: 14,
                                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                      padding: { top: 24 },
                                      lineNumbers: 'on',
                                      renderLineHighlight: 'all',
                                      scrollBeyondLastLine: false,
                                      smoothScrolling: true,
                                  }}
                              />
                          </TabsContent>

                          {/* GUIDE TAB */}
                          <TabsContent value="guide" className="flex-1 h-full m-0 p-0 overflow-hidden flex bg-slate-950 text-slate-300">
                              <div className="w-full h-full overflow-y-auto custom-scrollbar p-8 max-w-5xl mx-auto">
                                  
                                  {/* Tutorial Section */}
                                  <div className="mb-8">
                                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                          <Terminal size={18} className="text-blue-400"/> Writing Custom Components
                                      </h3>
                                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
                                          <p className="text-sm text-slate-400 leading-relaxed">
                                              Agflow dynamically creates nodes based on your Python code. The core requirement is a class named <code>CustomComponent</code> with a <code>build</code> method.
                                          </p>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                                  <span className="text-purple-400 font-bold block mb-1">1. Class Name</span>
                                                  Must be <code>CustomComponent</code>
                                              </div>
                                              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                                  <span className="text-blue-400 font-bold block mb-1">2. Method Name</span>
                                                  Must be <code>build(self, ...)</code>
                                              </div>
                                              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                                  <span className="text-orange-400 font-bold block mb-1">3. Inputs</span>
                                                  Arguments become node inputs
                                              </div>
                                          </div>

                                          <div className="bg-[#1e1e1e] p-4 rounded-lg border border-slate-800 font-mono text-sm shadow-inner">
                                              <span className="text-blue-400">class</span> <span className="text-yellow-400">CustomComponent</span>:<br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">def</span> <span className="text-yellow-300">build</span>(<span className="text-orange-400">self</span>, <span className="text-blue-300">prompt</span>: str, <span className="text-blue-300">api_key</span>: str) <span className="text-slate-500">{'->'} str:</span><br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-green-600"># Your logic here</span><br/>
                                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">return</span> <span className="text-green-300">"Result"</span>
                                          </div>
                                      </div>
                                  </div>

                                  <div className="h-px bg-slate-800 w-full mb-8" />

                                  {/* Examples Accordion */}
                                  <div>
                                      <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                                          <BookOpen size={18} className="text-green-400"/> Example Library
                                      </h3>
                                      <Accordion type="single" collapsible className="w-full space-y-3">
                                          {EXAMPLE_CATEGORIES.map((category) => (
                                              <AccordionItem key={category.id} value={category.id} className="border border-slate-800 bg-slate-900/40 rounded-xl px-2 overflow-hidden shadow-sm">
                                                  <AccordionTrigger className="hover:no-underline py-4 px-3 text-slate-200 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all">
                                                      <div className="flex items-center gap-3">
                                                          <div className="p-1.5 bg-slate-800 rounded text-slate-400">
                                                              <category.icon size={16} />
                                                          </div>
                                                          <span className="text-sm font-semibold">{category.title}</span>
                                                          <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-500 px-2 py-0.5 rounded-full ml-2">
                                                              {category.examples.length} Examples
                                                          </span>
                                                      </div>
                                                  </AccordionTrigger>
                                                  <AccordionContent className="pt-2 pb-4 px-3 space-y-4">
                                                      {category.examples.map((ex, idx) => (
                                                          <div key={idx} className="bg-[#1e1e1e] rounded-lg border border-slate-800 overflow-hidden shadow-sm group">
                                                              <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 group-hover:bg-slate-800 transition-colors">
                                                                  <span className="text-xs text-slate-200 font-medium font-mono">{ex.title}</span>
                                                                  <CopyButton code={ex.code} />
                                                              </div>
                                                              <pre className="p-4 text-xs text-blue-100 font-mono leading-relaxed overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                                                  {ex.code}
                                                              </pre>
                                                          </div>
                                                      ))}
                                                  </AccordionContent>
                                              </AccordionItem>
                                          ))}
                                      </Accordion>
                                  </div>
                              </div>
                          </TabsContent>
                      </Tabs>
                  </div>
              </DialogContent>
          </Dialog>
      </div>

      {/* Dynamic Inputs */}
      <div className="flex flex-col">
        {inputs.length === 0 ? (
            <div className="p-4 text-center border-b border-slate-800/50">
                <p className="text-[10px] text-slate-500 mb-1.5 italic">No inputs detected</p>
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-900 rounded border border-slate-800">
                    <code className="text-[9px] text-purple-400 font-mono">def build(...)</code>
                </div>
            </div>
        ) : (
            inputs.map((inputName) => (
                <NodeField 
                    key={inputName} 
                    id={inputName} 
                    label={inputName} 
                    inputType="target" 
                    handleColor="purple"
                >
                    <div className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded w-fit">
                        input
                    </div>
                </NodeField>
            ))
        )}
      </div>

      {/* Output */}
      <NodeField label="Result" id="output" inputType="source" handleColor="purple">
         <div className="text-right text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded w-fit ml-auto">
             return
         </div>
      </NodeField>
    </NodeCard>
  );
}