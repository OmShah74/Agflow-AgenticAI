import React, { useState, useEffect, useCallback } from 'react';
import { NodeProps, useReactFlow, useUpdateNodeInternals } from '@xyflow/react'; // Added useUpdateNodeInternals
import { Code, Save, Layers, Box, BookOpen, Copy, Check, RotateCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { NodeCard, NodeHeader, NodeField } from './NodeComponents';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog"; 
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';

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

const CodeSnippet = ({ code, title }: { code: string, title: string }) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mb-4 border border-slate-700 rounded-md overflow-hidden bg-slate-900/50">
            <div className="bg-slate-800/80 px-3 py-1.5 flex justify-between items-center border-b border-slate-700">
                <span className="text-xs text-slate-300 font-mono font-medium">{title}</span>
                <button onClick={copyToClipboard} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition-colors">
                    {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
            <pre className="bg-[#1e1e1e] p-3 text-xs text-blue-100 overflow-x-auto font-mono leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                {code}
            </pre>
        </div>
    );
};

export default function CustomComponentNode({ data, id, selected }: NodeProps<any>) {
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals(); // Hook to refresh handles
  const [code, setCode] = useState(data.code || DEFAULT_CODE);
  const [inputs, setInputs] = useState<string[]>(data.detectedInputs || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // --- PARSER LOGIC ---
  const parseInputs = useCallback((codeString: string) => {
    try {
        // Regex looks for: def build(self, arg1, arg2):
        const regex = /def\s+build\s*\(\s*self\s*,?\s*([\s\S]*?)\)\s*(?:->.*?)?:/;
        const match = codeString.match(regex);

        if (match && match[1]) {
            const rawArgs = match[1].split(',');
            
            return rawArgs
                .map(arg => {
                    let cleanArg = arg.trim();
                    // Remove type hints
                    if (cleanArg.includes(':')) cleanArg = cleanArg.split(':')[0].trim();
                    // Remove default values
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
      
      // 1. Update Node Data
      setNodes((nds) => nds.map((node) => {
          if (node.id === id) {
              return { 
                  ...node, 
                  data: { ...node.data, code: code, detectedInputs: detectedInputs } 
              };
          }
          return node;
      }));
      
      // 2. Trigger React Flow Update (CRITICAL for Dynamic Handles)
      setTimeout(() => updateNodeInternals(id), 0);
      
      if (detectedInputs.length > 0) {
          toast.success(`Compiled: ${detectedInputs.length} inputs detected.`);
      } else {
          toast.warning("No inputs detected. Check your build() method.");
      }
      
      setIsDialogOpen(false);
  };

  // Sync inputs on load
  useEffect(() => {
      if (data.detectedInputs) {
          setInputs(data.detectedInputs);
      } else {
          const detected = parseInputs(code);
          if (detected.length > 0) {
              setInputs(detected);
              // Force update handles on initial load
              setTimeout(() => updateNodeInternals(id), 100);
          }
      }
  }, [data.detectedInputs, code, parseInputs, id, updateNodeInternals]);

  return (
    <NodeCard selected={selected}>
      <NodeHeader icon={Layers} title="Custom Python" color="purple" badge="Script" />
      
      {/* Edit Button Area */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/30">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-8 bg-slate-900 border-slate-700 text-xs text-slate-300 hover:text-white hover:border-purple-500/50 transition-all flex items-center justify-center gap-2 group">
                      <Code className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" /> 
                      Edit Code
                  </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-5xl h-[85vh] bg-slate-950 border-slate-800 flex flex-col p-0 gap-0 shadow-2xl overflow-hidden focus:outline-none">
                  {/* Header */}
                  <DialogHeader className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex-row items-center justify-between space-y-0 shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                              <Box className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                              <DialogTitle className="text-slate-100 text-sm font-semibold tracking-wide">Component Editor</DialogTitle>
                              <p className="text-[10px] text-slate-500">Define your custom logic in Python</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2 mr-8">
                          <Button size="sm" onClick={handleSaveCode} className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs px-3 shadow-sm">
                              <Save className="w-3 h-3 mr-1.5" /> Save & Compile
                          </Button>
                      </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-hidden bg-[#1e1e1e] flex flex-col">
                      <Tabs defaultValue="editor" className="h-full flex flex-col">
                          <div className="bg-slate-900 border-b border-slate-800 px-4 shrink-0">
                              <TabsList className="bg-transparent h-9 p-0 gap-4 w-full justify-start">
                                  <TabsTrigger value="editor" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-purple-500 rounded-none h-full px-2 text-slate-400 data-[state=active]:text-purple-400 text-[11px] font-semibold tracking-wider">
                                      CODE EDITOR
                                  </TabsTrigger>
                                  <TabsTrigger value="guide" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none h-full px-2 text-slate-400 data-[state=active]:text-blue-400 text-[11px] font-semibold tracking-wider">
                                      EXAMPLES & DOCS
                                  </TabsTrigger>
                              </TabsList>
                          </div>

                          <TabsContent value="editor" className="flex-1 h-full m-0 p-0 relative">
                              <Editor
                                  height="100%"
                                  defaultLanguage="python"
                                  theme="vs-dark"
                                  value={code}
                                  onChange={(value) => setCode(value || "")}
                                  options={{
                                      minimap: { enabled: false },
                                      fontSize: 13,
                                      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                                      padding: { top: 16 },
                                      lineNumbers: 'on',
                                      renderLineHighlight: 'all',
                                      scrollBeyondLastLine: false,
                                  }}
                              />
                          </TabsContent>

                          <TabsContent value="guide" className="flex-1 h-full m-0 p-6 overflow-y-auto bg-slate-950 text-slate-300">
                              <div className="max-w-3xl mx-auto space-y-8 pb-10">
                                  <div>
                                      <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                          <BookOpen size={16} className="text-blue-400"/> How it Works
                                      </h3>
                                      <p className="text-xs text-slate-400 leading-relaxed mb-3">
                                          The editor looks for a method signature <code>def build(self, arg1, arg2):</code> to automatically create input handles on the node.
                                      </p>
                                      <div className="p-3 bg-slate-900/50 rounded border border-slate-800 text-xs text-slate-400 font-mono">
                                          <span className="text-purple-400">def</span> build(<span className="text-orange-400">self</span>, <span className="text-blue-400">prompt</span>, <span className="text-blue-400">api_key</span>) <span className="text-slate-500">{'->'} str:</span>
                                      </div>
                                  </div>

                                  <div className="h-px bg-slate-800 w-full" />

                                  <div>
                                      <h3 className="text-sm font-bold text-white mb-4">Templates</h3>
                                      <CodeSnippet 
                                          title="String Processing"
                                          code={`class CustomComponent:
    def build(self, text: str) -> str:
        return text.upper() + " [PROCESSED]"`}
                                      />
                                      <CodeSnippet 
                                          title="Agno Agent (Groq)"
                                          code={`from agno.agent import Agent
from agno.models.groq import Groq

class CustomComponent:
    def build(self, prompt: str, api_key: str) -> str:
        agent = Agent(model=Groq(id="llama-3.3-70b-versatile", api_key=api_key))
        return agent.run(prompt).content`}
                                      />
                                      <CodeSnippet 
                                          title="External API Call"
                                          code={`import requests

class CustomComponent:
    def build(self, url: str) -> str:
        try:
            res = requests.get(url)
            return str(res.json())
        except Exception as e:
            return f"Error: {e}"`}
                                      />
                                  </div>
                              </div>
                          </TabsContent>
                      </Tabs>
                  </div>
              </DialogContent>
          </Dialog>
      </div>

      {/* DYNAMIC INPUTS SECTION */}
      <div className="flex flex-col border-b border-slate-800/50">
        {inputs.length === 0 ? (
            <div className="p-4 text-center">
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
                        {/* Placeholder text indicating this is a variable input */}
                        {'<variable>'}
                    </div>
                </NodeField>
            ))
        )}
      </div>

      {/* FIXED OUTPUT SECTION */}
      <NodeField label="Result" id="output" inputType="source" handleColor="purple">
         <div className="text-right text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded w-fit ml-auto">
             return
         </div>
      </NodeField>
    </NodeCard>
  );
}