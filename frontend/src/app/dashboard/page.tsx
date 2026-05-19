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
  Terminal,
  Gauge,
  Workflow,
  CpuIcon
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   TYPES & MOCK DATA
   Premium editorial themes mapped to brand tokens.
   No standard Tailwind blues/purples are allowed.
   All badges, charts, and metrics utilize terracotta, sage, and gold.
═══════════════════════════════════════════════════════════════ */

interface Agent {
  name: string;
  role: string;
  status: "active" | "idle" | "busy";
  efficiency: number;
  task: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string; // Tailored HSL theme
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
  type: "record" | "interaction" | "optimization";
  details: string;
}

const mockAgents: Agent[] = [
  {
    name: "Coordinator",
    role: "Task Delegation & Planning",
    status: "active",
    efficiency: 98,
    task: "Coordinating workspace tasks and resource queues",
    icon: Cpu,
    accentColor: "border-border text-foreground bg-muted/60",
  },
  {
    name: "Developer",
    role: "Development & Code Review",
    status: "busy",
    efficiency: 94,
    task: "Updating application styles and styling systems",
    icon: Layers,
    accentColor: "border-border text-foreground bg-muted/60",
  },
  {
    name: "Researcher",
    role: "Information Search & Summary",
    status: "idle",
    efficiency: 89,
    task: "Ready to retrieve workspace documents",
    icon: Search,
    accentColor: "border-border text-foreground bg-muted/60",
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: "act-1",
    type: "agent",
    title: "Task Routing Complete",
    desc: "Coordinator assigned task #128 to Developer successfully",
    time: "2 mins ago",
    status: "success",
  },
  {
    id: "act-2",
    type: "memory",
    title: "Workspace storage optimization",
    desc: "Cleaned up obsolete workspace notes and temporary cache",
    time: "15 mins ago",
    status: "success",
  },
  {
    id: "act-3",
    type: "system",
    title: "Slow Response Warning",
    desc: "Main server response time temporarily increased to 4.2s",
    time: "1h ago",
    status: "warning",
  },
  {
    id: "act-4",
    type: "agent",
    title: "Workspace files indexed",
    desc: "Indexed 12 new workspace documents for styling references",
    time: "3h ago",
    status: "info",
  },
];

const mockInsights: Insight[] = [
  {
    id: "in-1",
    category: "Workspace Memory",
    text: "Developer history is long. Consider archiving completed tasks.",
    impact: "+18% speed",
    type: "warning",
  },
  {
    id: "in-2",
    category: "Storage Space",
    text: "Identified highly organized document groups for 'styling-system'. Workspace storage is optimized.",
    impact: "99.4% recall",
    type: "success",
  },
  {
    id: "in-3",
    category: "Task Delivery",
    text: "Coordinator successfully distributed 3 sub-tasks to team members.",
    impact: "Saved 2.4m",
    type: "info",
  },
];

const mockTimeline: TimelineEvent[] = [
  {
    id: "time-1",
    title: "Workspace Notes Linked",
    timestamp: "14:32",
    type: "record",
    details: "Linked 'Config Updates' with 'styling variables'",
  },
  {
    id: "time-2",
    title: "Recent Chat Logged",
    timestamp: "14:15",
    type: "interaction",
    details: "Saved chat session about application theme configurations",
  },
  {
    id: "time-3",
    title: "Workspace Storage Cleaned",
    timestamp: "13:00",
    type: "optimization",
    details: "Storage cleanup removed 42 unused items",
  },
];

const mockRecommendations = [
  { title: "Optimize storage", desc: "Consolidate overlapping document sections", action: "Optimize" },
  { title: "Review system logs", desc: "Check recent server response logs", action: "Review" },
  { title: "Clear cache", desc: "Remove 412 MB of temporary server files", action: "Prune" },
];

export default function DashboardPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [healthScore, setHealthScore] = useState(94);
  const [memoryLoad, setMemoryLoad] = useState(72);
  const [orchestrationRate, setOrchestrationRate] = useState(88);
  const [greeting, setGreeting] = useState("System Active");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting("Good morning");
    else if (hrs < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const triggerRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setHealthScore(Math.floor(Math.random() * 6) + 93);
      setMemoryLoad(Math.floor(Math.random() * 15) + 65);
      setOrchestrationRate(Math.floor(Math.random() * 8) + 85);
    }, 1200);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-16 transition-all duration-300 font-sans">
      
      {/* ── SECTION 1: EDITORIAL WELCOME HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-10 shadow-sm"
      >
        {/* Editorial radial overlay */}
        <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-96 h-96 bg-primary/5 dark:bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono tracking-wider uppercase text-primary font-bold">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              System Core v1.0.4
            </div>
            
            <h1 className="text-3xl md:text-5xl font-display font-medium tracking-tight text-foreground">
              {greeting}, <span className="font-serif italic font-semibold text-foreground">Tejas</span>
            </h1>
            
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl font-light leading-relaxed">
              Cognitive OS is operating normally. Your active assistants are processing tasks, optimizing workspace storage, and monitoring response latency.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <button 
              onClick={triggerRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border hover:bg-muted/60 text-foreground text-xs font-semibold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", refreshing && "animate-spin text-foreground")} />
              Sync State
            </button>
            <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-sm">
              <MessageSquare className="w-4 h-4" />
              New Thread
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── SECTION 2: VECTOR RADIAL GAUGES DECK ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GAUGE 1: COGNITIVE HEALTH */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="glass-panel border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative group hover:border-primary/20 transition-all"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Health</h3>
                <span className="text-[10px] text-foreground/80 font-mono font-medium">System Health Stats</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-muted text-foreground border border-border px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Optimal
            </span>
          </div>

          <div className="flex items-center justify-around py-4">
            {/* SVG High-Fidelity Radial Gauge */}
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background tracks */}
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-muted/40"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="42"
                  className="stroke-muted/20"
                  strokeWidth="2"
                  fill="transparent"
                />
                {/* Primary health arc */}
                <motion.circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-foreground"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray="326.7"
                  initial={{ strokeDashoffset: 326.7 }}
                  animate={{ strokeDashoffset: 326.7 - (326.7 * healthScore) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-medium tracking-tight text-foreground">{healthScore}%</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Health</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-foreground/75" />
              Recall rate:
            </span>
            <span className="font-semibold text-foreground">99.1%</span>
          </div>
        </motion.div>

        {/* GAUGE 2: VECTOR MEMORY DENSITY */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative group hover:border-primary/20 transition-all"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Memory Usage</h3>
                <span className="text-[10px] text-foreground/80 font-mono font-medium">Notes & Cache Allocation</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-muted text-foreground border border-border px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Stable
            </span>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-muted/40"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="42"
                  className="stroke-muted/20"
                  strokeWidth="2"
                  fill="transparent"
                />
                {/* Secondary health arc */}
                <motion.circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-foreground/60"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray="326.7"
                  initial={{ strokeDashoffset: 326.7 }}
                  animate={{ strokeDashoffset: 326.7 - (326.7 * memoryLoad) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-medium tracking-tight text-foreground">{memoryLoad}%</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Usage</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-foreground/75" />
              Index overhead:
            </span>
            <span className="font-semibold text-foreground">12ms</span>
          </div>
        </motion.div>

        {/* GAUGE 3: ORCHESTRATION STABILITY */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-panel border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative group hover:border-primary/20 transition-all"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Task Completion</h3>
                <span className="text-[10px] text-foreground/80 font-mono font-medium">Completion Rate</span>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-muted text-foreground border border-border px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Balanced
            </span>
          </div>

          <div className="flex items-center justify-around py-4">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-muted/40"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="42"
                  className="stroke-muted/20"
                  strokeWidth="2"
                  fill="transparent"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-foreground/35"
                  strokeWidth="6"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray="326.7"
                  initial={{ strokeDashoffset: 326.7 }}
                  animate={{ strokeDashoffset: 326.7 - (326.7 * orchestrationRate) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-medium tracking-tight text-foreground">{orchestrationRate}%</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Completion</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/80 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-foreground/75" />
              Response latency:
            </span>
            <span className="font-semibold text-foreground">1.8s</span>
          </div>
        </motion.div>

      </div>

      {/* ── MIDDLE WORKSPACE GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: SWARM CONTROLS & INSIGHTS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* SECTION 3: ACTIVE AGENT SWARM DECK */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel border border-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wide font-display">Active Assistants</h2>
                  <p className="text-[11px] text-muted-foreground">Assistants coordinate to process complex workspace requests</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-2 border border-border/80 px-3 py-1 rounded-xl bg-muted/40">
                <span className="w-1.5 h-1.5 rounded-full bg-foreground glow-dot" />
                3 Assistants Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {mockAgents.map((agent) => {
                const AgentIcon = agent.icon;
                return (
                  <div
                    key={agent.name}
                    className="p-5 bg-card border border-border rounded-2xl flex flex-col justify-between gap-5 transition-all hover:border-primary/25 hover:shadow-sm group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl border transition-colors", agent.accentColor)}>
                          <AgentIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-foreground truncate">{agent.name}</h3>
                          <p className="text-[9px] text-muted-foreground truncate font-mono">{agent.role}</p>
                        </div>
                      </div>
                      <span className={cn("text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
                        agent.status === "active" ? "bg-foreground/10 text-foreground border-foreground/20" :
                        agent.status === "busy" ? "bg-foreground/5 text-muted-foreground border-foreground/10" :
                        "bg-muted text-muted-foreground border-border"
                      )}>
                        {agent.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>Efficiency</span>
                        <span className="font-semibold text-foreground">{agent.efficiency}%</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            agent.efficiency > 95 ? "bg-foreground" : "bg-foreground/50"
                          )}
                          style={{ width: `${agent.efficiency}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/80">
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-foreground/90 transition-colors font-light">
                        <span className="font-semibold font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Current Action:</span> {agent.task}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* SECTION 4: AI INSIGHTS CARD */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="glass-panel border border-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wide font-display">System Insights</h2>
                  <p className="text-[11px] text-muted-foreground">Analytic findings compiled from processing activity</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {mockInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 bg-muted/30 rounded-2xl border border-border/80 flex flex-col justify-between gap-3 transition-all hover:bg-muted/50 group"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[11px] font-bold font-mono tracking-wider uppercase text-foreground">{insight.category}</span>
                    <span className="text-[9px] font-mono text-foreground bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded font-semibold">
                      {insight.impact}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed font-light group-hover:text-foreground/90 transition-colors">
                    {insight.text}
                  </p>

                  <div className="pt-2 flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-foreground">
                    <span>View Details</span>
                    <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN: EVENT LOGS & MEMORY TIMELINE */}
        <div className="space-y-8">
          
          {/* SECTION 5: REAL-TIME COGNITIVE JOURNAL */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-panel border border-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wide font-display">Activity History</h2>
                  <p className="text-[11px] text-muted-foreground">System tracking logs</p>
                </div>
              </div>
            </div>

            <div className="relative border-l border-border/80 pl-4 space-y-6 ml-3">
              {mockTimeline.map((item) => (
                <div key={item.id} className="relative group text-xs">
                  {/* Styled physical static dot */}
                  <span className="absolute -left-[22.5px] top-1 w-3 h-3 rounded-full border border-border bg-card group-hover:bg-foreground group-hover:border-foreground/30 transition-all duration-300" />
                  
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-foreground font-mono text-[11px] group-hover:text-primary transition-colors">{item.title}</span>
                    <span className="text-[9px] text-muted-foreground font-mono bg-muted border border-border px-1.5 py-0.5 rounded-lg">{item.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-light">{item.details}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* SECTION 6: SYSTEM SWARM EVENT LOGS */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="glass-panel border border-border rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground tracking-wide font-display">System Logs</h2>
                  <p className="text-[11px] text-muted-foreground">Real-time activity logs</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {mockActivities.map((act) => (
                <div key={act.id} className="flex gap-3.5 items-start text-xs group">
                  <div className="mt-0.5 shrink-0">
                    {act.status === "success" && <CheckCircle2 className="w-4 h-4 text-foreground/80" />}
                    {act.status === "warning" && <ShieldAlert className="w-4 h-4 text-foreground/60" />}
                    {act.status === "info" && <Zap className="w-4 h-4 text-foreground/40" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold font-mono text-[11px] text-foreground group-hover:text-primary transition-colors truncate">{act.title}</span>
                      <span className="text-[9px] text-muted-foreground font-mono shrink-0">{act.time}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 font-light">{act.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

      </div>

      {/* ── SECTION 7: EDITORIAL CONTROLS RECOMMENDATIONS ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-panel border border-border rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-wide font-display">System Recommendations</h2>
              <p className="text-[11px] text-muted-foreground">Suggested optimizations to maximize system performance</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {mockRecommendations.map((rec, i) => (
            <div
              key={i}
              className="p-5 bg-card border border-border rounded-2xl flex items-center justify-between gap-4 transition-all hover:border-primary/20"
            >
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate font-mono uppercase tracking-wider">{rec.title}</h4>
                <p className="text-xs text-muted-foreground mt-1 font-light line-clamp-1">{rec.desc}</p>
              </div>
              
              <button className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/20 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shrink-0">
                {rec.action}
              </button>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
