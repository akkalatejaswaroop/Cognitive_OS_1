"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { 
  Bot, Settings2, ShieldCheck, Power, 
  Cpu, Terminal, Sparkles, RefreshCw, Zap
} from "lucide-react"
import { AuthGuard } from "@/components/AuthGuard"

// Mock Agents state
const initialAgents = [
  { id: "agent-1", name: "Coordinator", status: "active", efficiency: 98, role: "Task Planning", description: "Directs workspace task sequences and orchestrates agent actions." },
  { id: "agent-2", name: "Developer", status: "active", efficiency: 94, role: "Code Implementation", description: "Creates premium styling tokens and designs React components." },
  { id: "agent-3", name: "Researcher", status: "idle", efficiency: 89, role: "Knowledge Retrieval", description: "Retrieves documentation from indexed vector databases." },
]

export default function AgentsPage() {
  const [agents, setAgents] = useState(initialAgents)

  const toggleStatus = (id: string) => {
    setAgents(agents.map(a => {
      if (a.id === id) {
        return { ...a, status: a.status === "active" ? "idle" : "active" }
      }
      return a
    }))
  }

  return (
    <AuthGuard allowedRoles={["admin", "premium", "user"]}>
      <div className="space-y-8 pb-16 font-sans">
        
        {/* Header Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-8 md:p-10 shadow-sm"
        >
          <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono tracking-wider uppercase text-primary font-bold">
                <Bot className="w-3.5 h-3.5" />
                Assistant Swarm
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight text-foreground">
                Assistant <span className="font-serif italic font-semibold text-foreground">Swarm</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl font-light leading-relaxed">
                Deploy, evaluate, and control multiple autonomous agent workers designed to operate on your codebase.
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              <button className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-sm">
                <Power className="w-4 h-4" />
                Boot Swarm
              </button>
            </div>
          </div>
        </motion.div>

        {/* Swarm Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent, idx) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="glass-panel border border-border hover:border-primary/20 p-6 rounded-2xl flex flex-col justify-between gap-6 transition-all relative group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{agent.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono">{agent.role}</p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    agent.status === "active" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {agent.status}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed font-light">
                  {agent.description}
                </p>

                {/* Performance stats */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Performance Efficiency</span>
                    <span className="font-semibold text-foreground">{agent.efficiency}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground transition-all duration-500" 
                      style={{ width: `${agent.efficiency}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/80 flex items-center justify-between gap-3">
                <button 
                  onClick={() => toggleStatus(agent.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide border transition-all ${
                    agent.status === "active" 
                      ? "bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20" 
                      : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{agent.status === "active" ? "Disable" : "Initialize"}</span>
                </button>

                <button className="p-2 border border-border hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-all">
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </AuthGuard>
  )
}
