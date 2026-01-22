'use client'
import React from 'react';
import { Github, Bell, SquareActivity, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function HeaderWidgets() {
  const handleMCPClick = () => {
    toast.info("MCP Server Integration", {
        description: "This feature is currently under development. Stay tuned!",
        icon: <SquareActivity className="text-orange-400" size={16} />
    });
  };

  return (
    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <a href="https://github.com/OmShah74/Agflow-AgenticAI" target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                        <Github size={16} />
                    </a>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800">GitHub Repo</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <a href="https://discord.gg/agno" target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 127.14 96.36">
                            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.09,105.09,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.25-23.6-3.26-47.56-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                        </svg>
                    </a>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800">Discord</TooltipContent>
            </Tooltip>

            <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button onClick={handleMCPClick} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded transition-colors flex items-center gap-2">
                        <SquareActivity size={16} />
                        <span className="text-[10px] font-semibold hidden md:block">MCP</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800">MCP Server (Beta)</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
                        <Bell size={16} />
                    </button>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 text-white border-slate-800">Notifications</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
  );
}