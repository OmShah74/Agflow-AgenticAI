import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, RotateCcw } from 'lucide-react';
import { useReactFlow, useUpdateNodeInternals } from '@xyflow/react';

// --- Imports for Custom Functionality ---
import CodeEditorDialog from './CodeEditorDialog';
import { NodeField } from './NodeComponents';
import { NODE_PYTHON_TEMPLATES } from '@/lib/nodeTemplates';

// Interface for the component props
interface BaseNodeProps {
  children?: React.ReactNode;   // The standard UI elements (Inputs, Selects, etc.)
  title: string;                // Node Title (e.g. "Groq Model")
  icon?: LucideIcon;            // Node Icon
  color?: string;               // Theme color (purple, green, blue, etc.)
  data?: any;                   // React Flow node data object
  id?: string;                  // React Flow node ID
  selected?: boolean;           // Selection state for styling
  nodeType?: string;            // The key used to look up default code (e.g. 'groqModel')
}

export default function BaseNode({ 
  children, 
  title, 
  icon: Icon, 
  color = "purple", 
  data, 
  id, 
  selected, 
  nodeType 
}: BaseNodeProps) {
  
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // --- Dynamic Styling ---
  const colorStyles: Record<string, string> = {
    purple: "border-purple-500/50 shadow-purple-900/10",
    red: "border-red-500/50 shadow-red-900/10",
    blue: "border-blue-500/50 shadow-blue-900/10",
    green: "border-green-500/50 shadow-green-900/10",
    orange: "border-orange-500/50 shadow-orange-900/10",
    slate: "border-slate-700 shadow-black",
  };

  const activeColorClass = colorStyles[color] || colorStyles.slate;

  // --- Logic: Get Default Python Code ---
  const defaultCode = useMemo(() => {
      // 1. Check if specific template exists for this node type
      if (nodeType && NODE_PYTHON_TEMPLATES[nodeType]) {
          return NODE_PYTHON_TEMPLATES[nodeType];
      }
      // 2. Fallback generic template
      return `class CustomComponent:\n    def build(self, input_data: str) -> str:\n        return "Processed: " + input_data`;
  }, [nodeType]);

  // --- Handler: User Saved New Code ---
  const handleCodeSave = (newCode: string, inputs: string[]) => {
      if (!id) return;

      setNodes((nds) => nds.map((n) => {
          if (n.id === id) {
              return {
                  ...n,
                  data: {
                      ...n.data,
                      code: newCode,
                      detectedInputs: inputs,
                      isCustom: true // SWITCH TO CUSTOM MODE
                  }
              };
          }
          return n;
      }));

      // Critical: Tell React Flow to re-render handles immediately
      setTimeout(() => updateNodeInternals(id), 0);
  };

  // --- Handler: Reset to Standard UI ---
  const handleReset = () => {
      if (!id) return;
      
      const confirmReset = window.confirm("Reset to standard component? Your custom code changes will be lost.");
      if (!confirmReset) return;

      setNodes((nds) => nds.map((n) => {
          if (n.id === id) {
              // Remove custom flags to revert to children UI
              const { code, detectedInputs, isCustom, ...standardData } = n.data;
              return { 
                  ...n, 
                  data: { 
                      ...standardData, 
                      isCustom: false 
                  } 
              };
          }
          return n;
      }));

      // Re-render handles to match standard UI
      setTimeout(() => updateNodeInternals(id), 0);
  };

  return (
    <Card className={cn(
        "w-[300px] bg-slate-950 text-slate-200 border-2 transition-all duration-200", 
        activeColorClass,
        selected ? "ring-1 ring-white/20 shadow-lg" : "shadow-md"
    )}>
      {/* --- Header Section --- */}
      <CardHeader className="p-3 bg-slate-900/50 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
        
        {/* Title & Icon */}
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn("w-4 h-4 text-slate-400")} />}
          <CardTitle className="text-sm font-medium tracking-wide text-slate-200">
            {title}
          </CardTitle>
          
          {/* Custom Badge Indicator */}
          {data?.isCustom && (
              <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono tracking-tighter">
                  CUSTOM
              </span>
          )}
        </div>
        
        {/* Actions (Reset & Code Editor) */}
        <div className="flex items-center gap-1">
            {/* Show Reset Button only if in Custom Mode */}
            {data?.isCustom && (
                <button 
                    onClick={handleReset} 
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors" 
                    title="Reset to Standard UI"
                >
                    <RotateCcw size={13} />
                </button>
            )}
            
            {/* Code Editor Toggle */}
            {id && (
                <CodeEditorDialog 
                    initialCode={data?.code || defaultCode} 
                    nodeId={id} 
                    nodeType={nodeType || 'component'} 
                    onSave={handleCodeSave} 
                />
            )}
        </div>
      </CardHeader>
      
      {/* --- Body Section --- */}
      <CardContent className="p-0">
        {data?.isCustom ? (
            // --- MODE A: Custom Code UI (Dynamic Handles) ---
            <div className="flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Render Dynamic Inputs based on Python Build Signature */}
                {data.detectedInputs && data.detectedInputs.length > 0 ? (
                    data.detectedInputs.map((input: string) => (
                        <NodeField 
                            key={input} 
                            id={input} 
                            label={input} 
                            inputType="target" 
                            handleColor={color}
                        >
                            <div className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded w-fit border border-slate-800">
                                arg
                            </div>
                        </NodeField>
                    ))
                ) : (
                    <div className="p-4 text-center border-b border-slate-800/50">
                        <p className="text-[10px] text-slate-500 italic">
                            No arguments detected in <code>build()</code>
                        </p>
                    </div>
                )}

                {/* Always render one Output Handle for the return value */}
                <NodeField label="Result" id="output" inputType="source" handleColor={color}>
                    <div className="text-right text-[10px] text-slate-500 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded w-fit ml-auto border border-slate-800">
                        return
                    </div>
                </NodeField>
            </div>
        ) : (
            // --- MODE B: Standard Hardcoded UI ---
            <div className="p-0">
                {children}
            </div>
        )}
      </CardContent>
    </Card>
  );
}