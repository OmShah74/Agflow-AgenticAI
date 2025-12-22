import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Reusable sleek wrapper
export default function BaseNode({ children, title, icon: Icon, color = "purple" }: any) {
  const colorClass = {
    purple: "border-purple-500/50",
    red: "border-red-500/50",
    blue: "border-blue-500/50",
    green: "border-green-500/50",
  }[color as string] || "border-slate-700";

  return (
    <Card className={cn("w-72 bg-slate-950 text-slate-200 shadow-xl border-2", colorClass)}>
      <CardHeader className="p-3 bg-slate-900/50 border-b border-slate-800 flex flex-row items-center gap-2 space-y-0">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <CardTitle className="text-sm font-medium tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {children}
      </CardContent>
    </Card>
  );
}