import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Editor from '@monaco-editor/react';
import { Code, Save, Box } from 'lucide-react';
import { toast } from 'sonner';

interface CodeEditorDialogProps {
  initialCode: string;
  nodeId: string;
  nodeType: string;
  onSave: (code: string, detectedInputs: string[]) => void;
  trigger?: React.ReactNode;
}

export default function CodeEditorDialog({ initialCode, nodeId, nodeType, onSave, trigger }: CodeEditorDialogProps) {
  const [code, setCode] = useState(initialCode);
  const [isOpen, setIsOpen] = useState(false);

  // Sync state when prop changes
  useEffect(() => {
      if (initialCode) setCode(initialCode);
  }, [initialCode]);

  const parseInputs = (codeString: string) => {
    try {
        // Regex to extract arguments from: def build(self, arg1, arg2...):
        const regex = /def\s+build\s*\(\s*self\s*,?\s*([\s\S]*?)\)\s*(?:->.*?)?:/;
        const match = codeString.match(regex);
        if (match && match[1]) {
            return match[1].split(',')
                .map(arg => {
                    let clean = arg.trim();
                    if (clean.includes(':')) clean = clean.split(':')[0].trim();
                    if (clean.includes('=')) clean = clean.split('=')[0].trim();
                    return clean;
                })
                .filter(a => a && a !== 'self' && !a.startsWith('#'));
        }
        return [];
    } catch (e) { return []; }
  };

  const handleSave = () => {
      const inputs = parseInputs(code);
      onSave(code, inputs);
      setIsOpen(false);
      toast.success("Component compiled & saved!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-purple-400" title="Edit Code">
                <Code size={14} />
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] bg-slate-950 border-slate-800 flex flex-col p-0 gap-0 focus:outline-none shadow-2xl">
        <DialogHeader className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Box className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                    <DialogTitle className="text-slate-100 text-sm font-bold">Component Editor</DialogTitle>
                    <p className="text-[10px] text-slate-500 font-mono">Type: {nodeType}</p>
                </div>
            </div>
            <div className="flex gap-2 mr-8">
                <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs">
                    <Save className="w-3 h-3 mr-2" /> Save & Compile
                </Button>
            </div>
        </DialogHeader>
        <div className="flex-1 bg-[#1e1e1e]">
            <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v || "")}
                options={{ 
                    minimap: { enabled: false }, 
                    fontSize: 13, 
                    fontFamily: "'JetBrains Mono', monospace",
                    scrollBeyondLastLine: false 
                }}
            />
        </div>
      </DialogContent>
    </Dialog>
  );
}