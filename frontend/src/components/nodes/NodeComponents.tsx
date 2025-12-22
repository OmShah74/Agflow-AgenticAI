import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// --- 1. Node Header ---
interface NodeHeaderProps {
  icon: LucideIcon;
  title: string;
  color?: string;
  badge?: string;
}

export const NodeHeader = ({ icon: Icon, title, color = "purple", badge }: NodeHeaderProps) => {
  const colors: Record<string, string> = {
    purple: "text-purple-400 border-purple-500/30",
    green: "text-green-400 border-green-500/30",
    blue: "text-blue-400 border-blue-500/30",
    red: "text-red-400 border-red-500/30",
    orange: "text-orange-400 border-orange-500/30",
    slate: "text-slate-400 border-slate-500/30",
  };

  const activeColor = colors[color] || colors.slate;

  return (
    <div className={cn("flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b", activeColor.split(' ')[1])}>
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", activeColor.split(' ')[0])} />
        <span className="font-semibold text-sm text-slate-100">{title}</span>
      </div>
      {badge && (
        <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
          {badge}
        </span>
      )}
    </div>
  );
};

// --- 2. Node Field (The Row inside the node) ---
interface NodeFieldProps {
  id?: string;
  label?: string;
  children?: React.ReactNode;
  inputType?: 'target' | 'source' | 'both' | 'none';
  handleColor?: string;
  required?: boolean;
}

export const NodeField = ({ id, label, children, inputType = 'none', handleColor = "purple", required }: NodeFieldProps) => {
  // Handle Styles
  const handleStyle = {
    width: '12px',
    height: '12px',
    background: handleColor === 'green' ? '#22c55e' : 
                handleColor === 'blue' ? '#3b82f6' : 
                handleColor === 'red' ? '#ef4444' : 
                handleColor === 'orange' ? '#f97316' : '#a855f7',
    border: '2px solid #0f172a',
  };

  return (
    <div className="relative flex flex-col px-4 py-3 gap-2 border-b border-slate-800/50 last:border-0 group">
      
      {/* Left Handle (Input) */}
      {(inputType === 'target' || inputType === 'both') && (
        <Handle 
          type="target" 
          position={Position.Left} 
          id={id} 
          style={{ ...handleStyle, left: '-6px' }} 
          className="transition-transform hover:scale-125"
        />
      )}

      {/* Label & Content */}
      <div className="flex flex-col gap-1.5">
        {label && (
           <div className="flex items-center gap-1">
             <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                {label} {required && <span className="text-red-500">*</span>}
             </span>
           </div>
        )}
        <div className="w-full">
            {children}
        </div>
      </div>

      {/* Right Handle (Output) */}
      {(inputType === 'source' || inputType === 'both') && (
        <Handle 
          type="source" 
          position={Position.Right} 
          id={id} 
          style={{ ...handleStyle, right: '-6px' }}
          className="transition-transform hover:scale-125"
        />
      )}
    </div>
  );
};

// --- 3. Base Card Wrapper ---
export const NodeCard = ({ children, selected }: { children: React.ReactNode, selected?: boolean }) => (
  <div className={cn(
    "w-[300px] bg-slate-950 rounded-xl border-2 shadow-xl transition-all duration-200",
    selected ? "border-purple-500 shadow-purple-900/20" : "border-slate-800 shadow-black"
  )}>
    {children}
  </div>
);