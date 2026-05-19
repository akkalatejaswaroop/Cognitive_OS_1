"use client";

import { Activity, Code, Search, CheckCircle, Bot } from "lucide-react";
import { useChatStore } from "@/store";

export function AgentActivity() {
  const { agents } = useChatStore();

  const getIcon = (id: string) => {
    switch (id) {
      case "supervisor":
        return Bot;
      case "coder-agent":
        return Code;
      case "research-agent":
        return Search;
      default:
        return Activity;
    }
  };

  const isSwarmActive = agents.some((a) => a.status === "executing");

  return (
    <div className="glass-panel rounded-2xl p-5 border border-border flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-500" />
          <h2 className="font-semibold text-sm text-foreground">Agent Swarm Activity</h2>
        </div>
        <span className={`flex items-center gap-2 text-xs px-2 py-1 rounded-full border transition-all ${
          isSwarmActive
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            isSwarmActive ? "bg-primary animate-ping" : "bg-emerald-500 animate-pulse"
          }`} />
          {isSwarmActive ? "Processing" : "Live"}
        </span>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => {
          const Icon = getIcon(agent.id);
          const isExecuting = agent.status === "executing";
          
          return (
            <div key={agent.id} className="relative p-4 bg-card/60 dark:bg-card/40 border border-border rounded-xl overflow-hidden transition-all duration-300 hover:bg-muted/40">
              {isExecuting && (
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_1.5s_infinite]" />
              )}
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-4 h-4 ${agent.color}`} />
                <span className="font-medium text-xs text-foreground/90">{agent.name}</span>
                <span className={`ml-auto text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  isExecuting ? "bg-primary/20 text-primary animate-pulse" : "bg-muted text-muted-foreground/60"
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-2 font-light">
                {isExecuting ? (
                  <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                )}
                <span className="truncate">{agent.task}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
