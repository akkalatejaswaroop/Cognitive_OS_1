"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Zap,
  TrendingUp,
  Database,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  Cpu,
  Layers,
  Activity,
  MessageSquare,
  ChevronRight,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   TYPES & MOCK DATA
═══════════════════════════════════════════════════════════════ */

interface Agent {
  name: string;
  role: string;
  status: "active" | "idle" | "busy";
  efficiency: number;
  task: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface ActivityItem {
  id: string;
  type: "system" | "agent" | "memory";
  title: string;
  desc: string;
  time: string;
  status: "success" | "warning" | "info";
}

interface Insight {
  id: string;
  category: string;
  text: string;
  impact: string;
  type: "info" | "success" | "warning";
}

interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  type: "vector" | "interaction" | "compaction";
  details: string;
}

const mockAgents: Agent[] = [
  {
    name: "Supervisor",
    role: "Task Delegation & Planning",
    status: "active",
    efficiency: 98,
    task: "Orchestrating multi-agent code analysis pipeline",
    icon: Cpu,
    color: "text-primary bg-primary/10 border-primary/20",
  },
  {
    name: "Coder-Agent",
    role: "Code Generation & Refactoring",
    status: "busy",
    efficiency: 94,
    task: "Refining responsive utility classes in DashboardLayout.tsx",
    icon: Layers,
    color: "text-secondary bg-secondary/10 border-secondary/20",
  },
  {
    name: "Research-Agent",
    role: "Web Search & Knowledge Synthesis",
    status: "idle",
    efficiency: 89,
    task: "Awaiting next user prompt instructions",
    icon: Search,
    color: "text-accent bg-accent/10 border-accent/20",
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: "act-1",
    type: "agent",
    title: "Orchestration Pipeline Complete",
    desc: "Supervisor routed task #128 to Coder-Agent successfully",
    time: "2 mins ago",
    status: "success",
  },
  {
    id: "act-2",
    type: "memory",
    title: "ChromaDB Memory compaction",
    desc: "Optimized 1.2k vectors, freed 14% context cache",
    time: "15 mins ago",
    status: "success",
  },
  {
    id: "act-3",
    type: "system",
    title: "High Latency Warning",
    desc: "Ollama locally hosted Llama-3 model token latency spiked to 4.2s",
    time: "1h ago",
    status: "warning",
  },
  {
    id: "act-4",
    type: "agent",
    title: "Research synthesis indexed",
    desc: "Indexed 12 docs on next-themes and responsive styling",
    time: "3h ago",
    status: "info",
  },
];

const mockInsights: Insight[] = [
  {
    id: "in-1",
    category: "Context Windows",
    text: "Coder-Agent context overhead is high. Consider compressing redundant code snippets.",
    impact: "+18% generation speed",
    type: "warning",
  },
  {
    id: "in-2",
    category: "Memory Density",
    text: "High-density vector clusters detected for topic 'tailwind-v4'. Vault is fully optimized.",
    impact: "99.4% recall rate",
    type: "success",
  },
  {
    id: "in-3",
    category: "Orchestration",
    text: "Supervisor successfully parallelized 3 sub-tasks across web-agent swarm today.",
    impact: "Saved 2.4m execution time",
    type: "info",
  },
];

const mockTimeline: TimelineEvent[] = [
  {
    id: "time-1",
    title: "Semantic Association Written",
    timestamp: "14:32",
    type: "vector",
    details: "Linked 'Tailwind Config Updates' with 'globals.css variables'",
  },
  {
    id: "time-2",
    title: "User Interaction Synced",
    timestamp: "14:15",
    type: "interaction",
    details: "Captured discussion on theme-provider client settings",
  },
  {
    id: "time-3",
    title: "Vector Compression Run",
    timestamp: "13:00",
    type: "compaction",
    details: "Garbage collection removed 42 dead references",
  },
];

const mockRecommendations = [
  { title: "Run memory compaction", desc: "Consolidate overlapping semantic namespaces", action: "Optimize" },
  { title: "Review supervisor logs", desc: "Inspect recent Llama model generation delays", action: "Review" },
  { title: "Clear cache", desc: "Clear 412 MB of system temp agent thoughts", action: "Prune" },
];

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [healthScore, setHealthScore] = useState(94);
  const [greeting, setGreeting] = useState("System Active");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Custom greeting depending on local hour
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const triggerRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setHealthScore(Math.floor(Math.random() * 6) + 93); // Random score between 93 and 98
    }, 1200);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-12 transition-all duration-300">
      
      {/* ── SECTION 1: WELCOME HERO SECTION ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-primary/5 p-6 md:p-8"
      >
        {/* Subtle decorative mesh background inside the hero */}
        <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
        <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-primary/10 to-transparent blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/20 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="w-3 h-3" /> Cognitive Kernel v1.0.4
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              {greeting}, <span className="gradient-text font-bold">Commander</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl font-light">
              Cognitive OS is running optimal. Active swarm contains 3 agents executing code analysis, local memory sync, and research orchestration.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button 
              onClick={triggerRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted/80 text-foreground text-sm font-medium rounded-xl transition-all"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing ? "animate-spin text-primary" : ""}`} />
              Sync State
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-medium rounded-xl transition-all shadow-[0_4px_20px_rgba(59,130,246,0.25)] dark:shadow-[0_4px_20px_rgba(59,130,246,0.4)]">
              <MessageSquare className="w-4 h-4" />
              New Thread
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── MIDDLE GRID SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: HEALTH SCORE & AGENTS */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ── SECTION 2: COGNITIVE HEALTH SCORE ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="glass-panel border border-border rounded-2xl p-6 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <Brain className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wide">Cognitive Health</h2>
                </div>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Optimal
                </span>
              </div>

              <div className="flex items-center gap-6 py-2">
                {/* SVG Radial Gauge */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-muted"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <motion.circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="stroke-primary"
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray="251.2"
                      initial={{ strokeDashoffset: 251.2 }}
                      animate={{ strokeDashoffset: 251.2 - (251.2 * healthScore) / 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tracking-tight text-foreground">{healthScore}%</span>
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">Score</span>
                  </div>
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cache Hit Rate</span>
                    <span className="font-mono text-foreground">98.4%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Embedding Speed</span>
                    <span className="font-mono text-foreground">12ms</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Memory Recall</span>
                    <span className="font-mono text-foreground">99.1%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Memory clustering index optimized 2 hours ago</span>
              </div>
            </motion.div>

            {/* ── SECTION 3: AI INSIGHTS PANEL ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="glass-panel border border-border rounded-2xl p-6 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wide">AI Engine Insights</h2>
                </div>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[140px] pr-1 custom-scrollbar">
                {mockInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-2.5 bg-muted/40 rounded-xl border border-border text-xs flex flex-col gap-1 justify-between transition-colors hover:bg-muted/65"
                  >
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-foreground/90 font-semibold">{insight.category}</span>
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {insight.impact}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed font-light">{insight.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            
          </div>

          {/* ── SECTION 6: AI AGENT STATUS ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-accent">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground tracking-wide">Active Agent Swarm</h2>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                3 Agents Connected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockAgents.map((agent) => {
                const AgentIcon = agent.icon;
                return (
                  <div
                    key={agent.name}
                    className="p-4 bg-card border border-border rounded-xl flex flex-col justify-between gap-4 transition-all hover:border-primary/20 hover:bg-muted/10 group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2 rounded-lg border", agent.color)}>
                          <AgentIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-foreground">{agent.name}</h3>
                          <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{agent.role}</p>
                        </div>
                      </div>
                      <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        agent.status === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        agent.status === "busy" ? "bg-primary/10 text-primary border-primary/20 animate-pulse" :
                        "bg-muted text-muted-foreground border-border"
                      )}>
                        {agent.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Efficiency</span>
                        <span className="font-mono font-medium text-foreground">{agent.efficiency}%</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${agent.efficiency}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground/90 transition-colors">
                        <span className="font-semibold">Task:</span> {agent.task}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITIES & MEMORY TIMELINE */}
        <div className="space-y-6">
          
          {/* ── SECTION 4: RECENT ACTIVITIES ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-panel border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <Sliders className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground tracking-wide">Recent Swarm Event Logs</h2>
              </div>
            </div>

            <div className="space-y-4">
              {mockActivities.map((act) => (
                <div key={act.id} className="flex gap-3 items-start text-xs group">
                  <div className="mt-0.5 shrink-0">
                    {act.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {act.status === "warning" && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                    {act.status === "info" && <Zap className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">{act.title}</span>
                      <span className="text-[9px] text-muted-foreground font-mono shrink-0">{act.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5 font-light">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── SECTION 5: MEMORY TIMELINE ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-panel border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-foreground tracking-wide">Memory Journal</h2>
              </div>
            </div>

            <div className="relative border-l border-border pl-4 space-y-5 ml-2.5">
              {mockTimeline.map((item) => (
                <div key={item.id} className="relative group text-xs">
                  {/* Timeline bullet dot */}
                  <span className="absolute -left-[21.5px] top-1 w-2.5 h-2.5 rounded-full border border-border bg-card group-hover:bg-secondary group-hover:scale-110 transition-all" />
                  
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-foreground font-sans">{item.title}</span>
                    <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{item.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-light">{item.details}</p>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>

      {/* ── SECTION 7: SMART RECOMMENDATIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Sliders className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-foreground tracking-wide">Smart OS Recommendations</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockRecommendations.map((rec, i) => (
            <div
              key={i}
              className="p-4 bg-card border border-border rounded-xl flex items-center justify-between gap-4 transition-theme hover:bg-muted/40"
            >
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-foreground truncate">{rec.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-light line-clamp-1">{rec.desc}</p>
              </div>
              <button className="px-3 py-1.5 bg-primary/15 text-primary hover:bg-primary/25 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors shrink-0">
                {rec.action}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
