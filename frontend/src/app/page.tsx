"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Cpu,
  Database,
  Network,
  Brain,
  Activity,
  Sliders,
  ChevronRight,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Command,
  HelpCircle,
  Eye,
  CheckCircle2,
  RefreshCw,
  Play,
  Check,
  Zap,
  Server,
  Layers,
  Settings,
  AlertCircle,
} from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

/* ═══════════════════════════════════════════════════════════════
   TYPES & TYPESCRIPT INTERFACES
   ═══════════════════════════════════════════════════════════════ */

interface TerminalLog {
  text: string;
  type: "system" | "success" | "warning" | "input";
  time: string;
}

interface Capability {
  id: string;
  num: string;
  title: string;
  serifSubtitle: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
}

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & STATIC DATA
   ═══════════════════════════════════════════════════════════════ */

const SYSTEM_CAPABILITIES: Capability[] = [
  {
    id: "cap-1",
    num: "01",
    title: "Task Assistants",
    serifSubtitle: "shared workflow support",
    desc: "Coordination models route complex workflows to specialized assistants, ensuring seamless task execution across coding and research domains.",
    icon: Network,
    colorClass: "text-accent-ember border-accent-ember/20",
    bgClass: "bg-accent-ember/5",
  },
  {
    id: "cap-2",
    num: "02",
    title: "Knowledge Base",
    serifSubtitle: "simple notes storage",
    desc: "High-density long-term information storage. Keeps background context clear, compact, and optimized for instant recall.",
    icon: Database,
    colorClass: "text-accent-gold border-accent-gold/20",
    bgClass: "bg-accent-gold/5",
  },
  {
    id: "cap-3",
    num: "03",
    title: "Task Tracker",
    serifSubtitle: "live activity updates",
    desc: "Real-time streaming of assistant processes and tools. Track coordination steps, response speeds, and active changes live.",
    icon: Cpu,
    colorClass: "text-accent-sage border-accent-sage/20",
    bgClass: "bg-accent-sage/5",
  },
];

const INITIAL_LOGS: TerminalLog[] = [
  { text: "workspace start", type: "input", time: "10:00:00" },
  { text: "Starting workspace...", type: "system", time: "10:00:01" },
  { text: "Connecting to database...", type: "system", time: "10:00:02" },
  { text: "Loading assistants (Coordinator, Coder, Researcher)... SUCCESS", type: "success", time: "10:00:03" },
  { text: "Cognitive OS is ready. Type a command to begin.", type: "success", time: "10:00:04" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function PremiumLandingPage() {
  const router = useRouter();

  useEffect(() => {
    // MVP: Bypass landing page and go straight to dashboard
    router.push("/dashboard");
  }, [router]);

  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>(INITIAL_LOGS);
  const [currentCmdInput, setCurrentCmdInput] = useState("");
  const [booting, setBooting] = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "agents" | "database" | "performance">("terminal");

  // Coordinated Swarm simulation states
  const [swarmRunning, setSwarmRunning] = useState(false);
  const [swarmStep, setSwarmStep] = useState(0);
  const [swarmLogs, setSwarmLogs] = useState<string[]>([]);
  const [selectedSwarmTask, setSelectedSwarmTask] = useState<"sso" | "pool">("sso");

  // Database optimization states
  const [dbOptimizing, setDbOptimizing] = useState(false);
  const [dbProgress, setDbProgress] = useState(0);
  const [dbConsoleOutput, setDbConsoleOutput] = useState<string[]>([]);

  // Performance simulation states
  const [refreshingPerf, setRefreshingPerf] = useState(false);
  const [metrics, setMetrics] = useState({
    latency: 12,
    pools: 12,
    accuracy: 99.4,
    cache: 314,
  });

  const runSimulatedCommand = (cmd: string) => {
    if (booting) return;
    setBooting(true);

    const timestamp = new Date().toTimeString().split(" ")[0];
    const newLogs: TerminalLog[] = [
      ...terminalLogs,
      { text: cmd, type: "input", time: timestamp },
    ];
    setTerminalLogs(newLogs);

    setTimeout(() => {
      let responseLogs: TerminalLog[] = [];
      if (cmd === "diagnostics") {
        responseLogs = [
          { text: "Checking system status...", type: "system", time: timestamp },
          { text: `[OK] Latency: Stable at ${metrics.latency}ms`, type: "success", time: timestamp },
          { text: `[OK] Database Pool: ${metrics.pools}/50 active connection slots`, type: "success", time: timestamp },
          { text: `[OK] Accuracy Index: ${metrics.accuracy}% accurate recall`, type: "success", time: timestamp },
          { text: "[OK] System status: Fully operational", type: "success", time: timestamp },
        ];
      } else if (cmd === "assistants" || cmd === "agents") {
        responseLogs = [
          { text: "Checking active assistant nodes...", type: "system", time: timestamp },
          { text: "[Coordinator] Coordinator Node: Idle | Awaiting routing instructions", type: "success", time: timestamp },
          { text: "[Researcher] Knowledge Syncer: Ready | Neon DB indexed", type: "success", time: timestamp },
          { text: "[Coder] Synthesis Engine: Ready | Connected to active workspace", type: "success", time: timestamp },
        ];
      } else if (cmd === "database" || cmd === "storage") {
        responseLogs = [
          { text: "Checking Neon DB storage catalogs...", type: "system", time: timestamp },
          { text: "[Database] Volume: 126.5 MB physical storage used", type: "success", time: timestamp },
          { text: "[Database] Table: public.auth_users (1,240 records)", type: "success", time: timestamp },
          { text: "[Database] Table: public.knowledge_base (9,850 records)", type: "success", time: timestamp },
          { text: "[Database] Integrity check: Healthy. Run 'optimize' or switch to the DB tab to compact schemas.", type: "success", time: timestamp },
        ];
      } else if (cmd === "optimize") {
        responseLogs = [
          { text: "Compacting page pools and indices...", type: "system", time: timestamp },
          { text: "[Success] Reclaimed 14.8 MB of physical storage sectors", type: "success", time: timestamp },
          { text: "[Success] Vacuum catalog runs complete", type: "success", time: timestamp },
        ];
        // Automatically enhance database stats
        setMetrics(prev => ({ ...prev, latency: 10, accuracy: 99.7 }));
      }
      setTerminalLogs((prev) => [...prev, ...responseLogs]);
      setBooting(false);
    }, 700);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCmdInput.trim()) return;
    const cmd = currentCmdInput.toLowerCase().trim();
    setCurrentCmdInput("");

    const timestamp = new Date().toTimeString().split(" ")[0];
    setTerminalLogs((prev) => [
      ...prev,
      { text: cmd, type: "input", time: timestamp },
    ]);

    setTimeout(() => {
      let reply: TerminalLog;
      if (cmd.includes("help")) {
        reply = { text: "Supported commands: 'diagnostics', 'assistants', 'database', 'optimize', 'clear', 'about'", type: "system", time: timestamp };
      } else if (cmd.includes("clear")) {
        setTerminalLogs([]);
        return;
      } else if (cmd === "diagnostics" || cmd === "assistants" || cmd === "database" || cmd === "optimize") {
        runSimulatedCommand(cmd);
        return;
      } else if (cmd.includes("swarm") || cmd.includes("assistant") || cmd.includes("agents")) {
        runSimulatedCommand("assistants");
        return;
      } else if (cmd.includes("journal") || cmd.includes("db") || cmd.includes("storage")) {
        runSimulatedCommand("database");
        return;
      } else if (cmd.includes("about")) {
        reply = { text: "Cognitive OS v1.0.4. Built with premium design, Neon storage layer, and offline capability.", type: "success", time: timestamp };
      } else {
        reply = { text: `Instruction '${cmd}' unrecognized. Type 'help' for options.`, type: "warning", time: timestamp };
      }
      setTerminalLogs((prev) => [...prev, reply]);
    }, 250);
  };

  // Coordinated Swarm simulation trigger
  const startSwarmSimulation = () => {
    if (swarmRunning) return;
    setSwarmRunning(true);
    setSwarmStep(0);
    setSwarmLogs([]);

    const taskTitle = selectedSwarmTask === "sso" 
      ? "Configure Google SSO integration" 
      : "Audit PostgreSQL Connection Pool";

    const steps = selectedSwarmTask === "sso" ? [
      { msg: "Coordinator Node: Parsed prompt request details.", time: "10:14:02" },
      { msg: "Coordinator Node: Formulated multi-agent roadmap and worker routing plan.", time: "10:14:03" },
      { msg: "Knowledge Syncer: Extracted schema definitions and secrets from database catalog.", time: "10:14:04" },
      { msg: "Synthesis Engine: Generated Better Auth configuration & provider credentials.", time: "10:14:06" },
      { msg: "Coordinator Node: Executed compiler checks. Validation successful. Task complete!", time: "10:14:07" }
    ] : [
      { msg: "Coordinator Node: Parsed pool inspection instruction details.", time: "10:14:02" },
      { msg: "Coordinator Node: Dispatched diagnostic query subtask to system tracker.", time: "10:14:03" },
      { msg: "Knowledge Syncer: Queried connection status catalog statistics from Neon DB.", time: "10:14:04" },
      { msg: "Synthesis Engine: Terminated 3 inactive pool leaks and adjusted max pool thresholds.", time: "10:14:06" },
      { msg: "Coordinator Node: Connection integrity check complete. Metrics optimized!", time: "10:14:07" }
    ];

    let current = 0;
    setSwarmLogs([`[INFO] Spawning coordinated workspace operation for: "${taskTitle}"`]);

    const interval = setInterval(() => {
      if (current < steps.length) {
        setSwarmLogs(prev => [...prev, `[${steps[current].time}] ${steps[current].msg}`]);
        setSwarmStep(current + 1);
        current++;
      } else {
        clearInterval(interval);
        setSwarmRunning(false);
      }
    }, 850);
  };

  // Database optimization trigger
  const startDbOptimization = () => {
    if (dbOptimizing) return;
    setDbOptimizing(true);
    setDbProgress(0);
    setDbConsoleOutput([]);

    const steps = [
      { msg: "Scanning local Neon database indices...", progress: 20 },
      { msg: "Executing VACUUM ANALYZE on public.auth_users...", progress: 45 },
      { msg: "Compressing index directories for public.knowledge_base...", progress: 75 },
      { msg: "Flushing inactive connection locks and reclaiming page heaps...", progress: 90 },
      { msg: "Optimized database pages. Reclaimed 14.8 MB of active memory!", progress: 100 }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setDbConsoleOutput(prev => [...prev, `[database-engine] ${steps[current].msg}`]);
        setDbProgress(steps[current].progress);
        current++;
      } else {
        clearInterval(interval);
        setDbOptimizing(false);
        setMetrics(prev => ({
          ...prev,
          latency: 10,
          accuracy: 99.7,
        }));
      }
    }, 600);
  };

  // Latency Metrics refresher
  const refreshPerformanceMetrics = () => {
    if (refreshingPerf) return;
    setRefreshingPerf(true);
    setTimeout(() => {
      setMetrics({
        latency: Math.floor(Math.random() * 4) + 9, // 9ms - 12ms
        pools: Math.floor(Math.random() * 5) + 10,  // 10 - 14 pools
        accuracy: parseFloat((99.2 + Math.random() * 0.6).toFixed(1)),
        cache: Math.floor(Math.random() * 20) + 300,
      });
      setRefreshingPerf(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-grid font-sans selection:bg-primary/20 selection:text-foreground">
      
      {/* ── TOP LUXURY NAVIGATION HEADER ── */}
      <MarketingHeader />

      {/* ── HERO GRAPHIC BACKDROP ── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] opacity-60 dark:opacity-40 animate-float" />
        <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[140px] opacity-50 dark:opacity-30" />
      </div>

      {/* ── MAIN CONTENT LAYER ── */}
      <main className="flex-grow z-10">
        
        {/* ── HERO SECTION: AN EDITORIAL MONUMENT ── */}
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 max-w-6xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            A Simple Coordinated Workspace
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-8xl tracking-tight leading-[1.05] font-display text-foreground max-w-4xl mb-8"
          >
            A Smart Workspace / <br />
            <span className="italic font-normal text-primary">Built for Your Tasks.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-[1.7] font-light mb-12"
          >
            Cognitive OS is a smart workspace that helps you manage tasks and notes easily. Keep track of what your digital assistants are doing in real time, and store your knowledge in a secure database.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto"
          >
            <Link href="/signup" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto group relative px-8 py-4 bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917] hover:bg-foreground/90 dark:hover:bg-[#EAE5DC] border border-transparent rounded-xl font-bold uppercase text-xs tracking-wider transition-all duration-300 shadow-md hover:shadow-xl active:scale-98">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-gold" />
                  Sign Up
                </span>
              </button>
            </Link>
            
            <a href="#terminal" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-muted/30 border border-border text-foreground font-bold uppercase text-xs tracking-wider rounded-xl transition-all">
                Try the Simulator
              </button>
            </a>
          </motion.div>
        </section>

        {/* ── INTERACTIVE CORE TERMINAL SIMULATOR ── */}
        <section id="terminal" className="py-16 md:py-24 px-6 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Interactive Simulator</h2>
            <p className="font-display italic text-3xl md:text-4xl text-foreground">Try Out Commands Below</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="glass-panel rounded-2xl border border-border/80 shadow-2xl overflow-hidden"
          >
            {/* Terminal Window Header Bar */}
            <div className="bg-[#1C1917]/95 dark:bg-[#141210]/95 px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-accent-ember/20 border border-accent-ember/80" />
                  <span className="w-3 h-3 rounded-full bg-accent-gold/20 border border-accent-gold/80" />
                  <span className="w-3 h-3 rounded-full bg-accent-sage/20 border border-accent-sage/80" />
                </div>
                <span className="text-xs font-mono text-white/40 tracking-wider">user@cognitive-os:~/workspace</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-white/55">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent-sage shadow-[0_0_8px_rgba(77,124,95,0.6)] animate-pulse" />
                  System Active
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/80 select-none">v1.0.4</span>
              </div>
            </div>

            {/* Terminal Window Body Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 min-h-[420px] bg-[#1C1917]/90 dark:bg-[#141210]/90">
              
              {/* Left Side Quick Menu Controls */}
              <div className="md:col-span-1 border-r border-white/5 p-5 flex flex-col gap-3 bg-black/20">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 font-mono">Workspace Controls</span>
                
                {[
                  { id: "terminal", label: "Interactive CLI", desc: "Type & execute inputs", icon: Terminal },
                  { id: "agents", label: "Agent Controller", desc: "Real-time swarm status", icon: Network },
                  { id: "database", label: "Neon DB Journal", desc: "Relational table schemas", icon: Database },
                  { id: "performance", label: "Diagnostics", desc: "Latency & pools", icon: Activity },
                ].map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <button
                      key={btn.id}
                      onClick={() => {
                        setActiveTab(btn.id as any);
                        // Output to terminal that we transitioned
                        const timestamp = new Date().toTimeString().split(" ")[0];
                        setTerminalLogs(prev => [
                          ...prev,
                          { text: `Navigated to ${btn.label} workspace tab.`, type: "system", time: timestamp }
                        ]);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all text-xs font-mono group flex flex-col gap-1 w-full ${
                        activeTab === btn.id
                          ? "bg-white/5 border-white/10 text-white"
                          : "border-transparent text-white/50 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:scale-105" />
                        {btn.label}
                      </span>
                      <span className="text-[9px] text-white/30 leading-tight group-hover:text-white/45">{btn.desc}</span>
                    </button>
                  );
                })}
              </div>

              {/* Terminal Logs & Console Screen */}
              <div className="md:col-span-3 p-6 flex flex-col justify-between min-h-[380px] bg-black/5">
                
                <AnimatePresence mode="wait">
                  {activeTab === "terminal" && (
                    <motion.div
                      key="terminal-pane"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col justify-between"
                    >
                      {/* Simulated Logs Screen Output */}
                      <div className="space-y-3.5 font-mono text-[11px] leading-relaxed max-h-[280px] overflow-y-auto pr-2 custom-scrollbar flex-1">
                        <AnimatePresence initial={false}>
                          {terminalLogs.map((log, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`flex items-start gap-3.5 ${
                                log.type === "input" ? "text-white" :
                                log.type === "success" ? "text-accent-sage" :
                                log.type === "warning" ? "text-accent-ember" : "text-white/70"
                              }`}
                            >
                              <span className="text-white/30 text-[9px] select-none pt-0.5">{log.time}</span>
                              <div className="flex-1 min-w-0">
                                {log.type === "input" ? (
                                  <span className="flex items-center gap-1 font-semibold text-white">
                                    <span className="text-primary select-none">&gt;</span>
                                    {log.text}
                                  </span>
                                ) : (
                                  <p className="font-light">{log.text}</p>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        
                        {booting && (
                          <div className="flex items-center gap-2 text-white/40 text-[10px] mt-2 animate-pulse">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span>Computing agent pipelines...</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Pill Actions */}
                      <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-2 items-center">
                        <span className="text-[9px] text-white/30 font-mono uppercase tracking-wider select-none">Quick Commands:</span>
                        {["diagnostics", "assistants", "database", "optimize", "clear"].map((cmd) => (
                          <button
                            key={cmd}
                            onClick={() => {
                              if (cmd === "clear") {
                                setTerminalLogs([]);
                              } else {
                                runSimulatedCommand(cmd);
                              }
                            }}
                            className="text-[10px] font-mono text-white/60 hover:text-white bg-white/5 border border-white/5 hover:border-white/15 px-2.5 py-1 rounded transition-colors"
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>

                      {/* Simulated Interactive Input Command Form */}
                      <form onSubmit={handleCommandSubmit} className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                        <span className="text-primary font-bold font-mono text-sm select-none animate-pulse">&gt;</span>
                        <input
                          type="text"
                          value={currentCmdInput}
                          onChange={(e) => setCurrentCmdInput(e.target.value)}
                          placeholder="Type a command (e.g. diagnostics, assistants, optimize, help)..."
                          className="flex-1 bg-transparent text-white border-0 outline-none focus:ring-0 font-mono text-xs placeholder:text-white/20"
                        />
                        <button type="submit" className="text-[10px] uppercase font-bold tracking-widest text-primary hover:text-white/80 transition-colors font-mono select-none px-3 py-1.5 bg-white/5 rounded border border-white/5 hover:bg-white/10">
                          Execute
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === "agents" && (
                    <motion.div
                      key="agents-pane"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col justify-between"
                    >
                      {/* Active Agent Nodes List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <span className="text-xs font-mono text-white/40 uppercase tracking-widest font-semibold">Active Agent Swarm Nodes</span>
                          <span className="text-[10px] font-mono text-accent-sage flex items-center gap-1.5 bg-accent-sage/10 px-2 py-0.5 rounded border border-accent-sage/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-sage animate-ping" />
                            All Nodes Online
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { name: "Coordinator", role: "Roadmap Router", status: swarmRunning ? "ROUTING" : "IDLE", metrics: "12ms Latency", icon: Server },
                            { name: "Researcher", role: "Neon DB Syncer", status: swarmRunning && swarmStep >= 2 ? "SYNCING" : "READY", metrics: "99.4% Recall", icon: Database },
                            { name: "Synthesis Coder", role: "Code Architect", status: swarmRunning && swarmStep >= 3 ? "COMPILING" : "READY", metrics: "v1.0.4 Main", icon: Cpu },
                          ].map((agent, index) => {
                            const Icon = agent.icon;
                            return (
                              <div key={index} className="p-3 rounded-xl border border-white/5 bg-white/5 flex flex-col gap-2 relative overflow-hidden group hover:border-white/10 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="p-1.5 rounded-lg bg-white/5 text-primary">
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    agent.status === "ROUTING" || agent.status === "SYNCING" || agent.status === "COMPILING"
                                      ? "bg-accent-ember/15 text-accent-ember border border-accent-ember/20"
                                      : "bg-white/10 text-white/60"
                                  }`}>
                                    {agent.status}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-mono font-semibold text-white">{agent.name}</p>
                                  <p className="text-[9px] font-mono text-white/40 leading-tight mt-0.5">{agent.role}</p>
                                </div>
                                <div className="text-[8px] font-mono text-white/30 border-t border-white/5 pt-1.5 mt-0.5">
                                  {agent.metrics}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Interactive Task Swarm Simulation */}
                        <div className="mt-4 p-4 rounded-xl border border-white/5 bg-black/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest font-semibold">Simulate Coordinated Workflows</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedSwarmTask("sso")}
                                disabled={swarmRunning}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${
                                  selectedSwarmTask === "sso"
                                    ? "bg-white/10 text-white border border-white/10"
                                    : "bg-transparent text-white/45 hover:text-white"
                                }`}
                              >
                                Google SSO Setup
                              </button>
                              <button
                                onClick={() => setSelectedSwarmTask("pool")}
                                disabled={swarmRunning}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded transition-all ${
                                  selectedSwarmTask === "pool"
                                    ? "bg-white/10 text-white border border-white/10"
                                    : "bg-transparent text-white/45 hover:text-white"
                                }`}
                              >
                                DB Pool Inspection
                              </button>
                            </div>
                          </div>

                          <div className="bg-black/40 rounded-lg p-3 border border-white/5 min-h-[90px] font-mono text-[9px] text-white/60 space-y-1.5 max-h-[110px] overflow-y-auto custom-scrollbar">
                            {swarmLogs.length === 0 ? (
                              <div className="text-white/20 italic flex items-center justify-center min-h-[70px] text-center">
                                Select a scenario and click "Trigger Swarm Workspace" below to visualize the collaboration pipeline.
                              </div>
                            ) : (
                              swarmLogs.map((log, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -3 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={log.includes("[INFO]") ? "text-primary" : log.includes("complete") ? "text-accent-sage font-semibold" : ""}
                                >
                                  {log}
                                </motion.div>
                              ))
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex gap-1.5">
                              {[1, 2, 3, 4].map((step) => (
                                <div
                                  key={step}
                                  className={`w-4 h-1.5 rounded transition-all duration-300 ${
                                    swarmStep >= step 
                                      ? "bg-accent-sage" 
                                      : swarmRunning && swarmStep === step - 1 
                                        ? "bg-accent-ember animate-pulse" 
                                        : "bg-white/10"
                                  }`}
                                />
                              ))}
                            </div>

                            <button
                              onClick={startSwarmSimulation}
                              disabled={swarmRunning}
                              className="text-[10px] font-mono text-primary hover:text-white border border-white/15 px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-white/5 transition-all select-none disabled:opacity-50 disabled:pointer-events-none uppercase font-bold tracking-wider"
                            >
                              {swarmRunning ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                  Running swarm...
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current text-primary" />
                                  Trigger Swarm Workspace
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {activeTab === "database" && (
                    <motion.div
                      key="database-pane"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col justify-between"
                    >
                      {/* Database Table Explorer */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <span className="text-xs font-mono text-white/40 uppercase tracking-widest font-semibold">Neon Relational DB Journal</span>
                          <span className="text-[10px] font-mono text-white/60">
                            Volume: <span className="text-white font-bold">126.5 MB</span>
                          </span>
                        </div>

                        <div className="space-y-2 border border-white/5 rounded-xl overflow-hidden bg-black/20 font-mono text-[10px]">
                          <div className="grid grid-cols-4 bg-white/5 p-2.5 text-white/40 font-bold border-b border-white/5 select-none">
                            <span>Catalog Table</span>
                            <span>Engine Type</span>
                            <span>Record Rows</span>
                            <span className="text-right">Index Volume</span>
                          </div>

                          {[
                            { name: "public.auth_users", type: "Table", rows: "1,240", size: "1.2 MB", status: "Healthy" },
                            { name: "public.user_sessions", type: "Table", rows: "3,410", size: "4.5 MB", status: "Active" },
                            { name: "public.knowledge_base", type: "Table", rows: "9,850", size: "32.4 MB", status: "Indexed" },
                            { name: "public.task_logs", type: "Table", rows: "42,010", size: "88.2 MB", status: "Compressed" },
                          ].map((row, idx) => (
                            <div key={idx} className="grid grid-cols-4 p-2.5 text-white/70 hover:bg-white/5 border-b border-white/5 last:border-b-0 transition-colors">
                              <span className="font-semibold text-white">{row.name}</span>
                              <span className="text-white/45">{row.type}</span>
                              <span className="text-primary font-bold">{row.rows}</span>
                              <span className="text-right text-white/55">{row.size}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Optimization Pane */}
                        <div className="p-4 rounded-xl border border-white/5 bg-black/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest font-semibold">Optimize DB Engine Page Slots</span>
                            <span className="text-[9px] font-mono text-white/40">Freed memory: <span className="text-accent-sage font-bold">14.8 MB</span> ready</span>
                          </div>

                          {/* Live Console Output */}
                          <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 min-h-[60px] font-mono text-[9px] text-white/60 space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar">
                            {dbConsoleOutput.length === 0 ? (
                              <div className="text-white/20 italic flex items-center justify-center min-h-[40px] text-center">
                                Database storage channels stable. Click "Optimize DB Space" to reclaim sector blocks.
                              </div>
                            ) : (
                              dbConsoleOutput.map((line, idx) => (
                                <div key={idx} className={line.includes("Complete!") ? "text-accent-sage" : ""}>
                                  {line}
                                </div>
                              ))
                            )}
                          </div>

                          {/* Progress bar and button */}
                          <div className="flex items-center justify-between pt-1 gap-6">
                            <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-accent-sage h-full transition-all duration-300"
                                style={{ width: `${dbProgress}%` }}
                              />
                            </div>

                            <button
                              onClick={startDbOptimization}
                              disabled={dbOptimizing}
                              className="text-[10px] font-mono text-primary hover:text-white border border-white/15 px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-white/5 transition-all select-none disabled:opacity-50 disabled:pointer-events-none uppercase font-bold tracking-wider shrink-0"
                            >
                              {dbOptimizing ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                                  Compacting... {dbProgress}%
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3 text-primary" />
                                  Optimize DB Space
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {activeTab === "performance" && (
                    <motion.div
                      key="performance-pane"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col justify-between"
                    >
                      {/* Premium Metrics Cards */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                          <span className="text-xs font-mono text-white/40 uppercase tracking-widest font-semibold">Real-Time System Diagnostics</span>
                          <button
                            onClick={refreshPerformanceMetrics}
                            disabled={refreshingPerf}
                            className="text-[10px] font-mono text-primary hover:text-white flex items-center gap-1 transition-colors disabled:opacity-40"
                          >
                            <RefreshCw className={`w-3 h-3 ${refreshingPerf ? "animate-spin" : ""}`} />
                            Refresh Metrics
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Card 1: System Latency */}
                          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Workspace Latency</span>
                              <Zap className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-mono font-bold text-white tracking-tight">{metrics.latency}ms</span>
                              <span className="text-[9px] font-mono text-accent-sage font-semibold uppercase">Exceptional</span>
                            </div>
                            {/* Visual Latency Sparkline Graph */}
                            <div className="h-6 flex items-end gap-1 pt-1 opacity-70">
                              {[35, 45, 30, 20, 25, 40, 15, 20, 18, metrics.latency === 10 ? 10 : 15].map((val, idx) => (
                                <div
                                  key={idx}
                                  className="flex-1 bg-white/10 rounded-t transition-all duration-500 hover:bg-white/30"
                                  style={{ height: `${val * 1.5}%` }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Card 2: DB Pool Connections */}
                          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Neon DB Connection Pool</span>
                              <Server className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-mono font-bold text-white tracking-tight">{metrics.pools}/50</span>
                              <span className="text-[9px] font-mono text-white/40">slots active</span>
                            </div>
                            {/* Horizontal connection pool bar */}
                            <div className="space-y-1 pt-1">
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-accent-sage h-full transition-all duration-500" 
                                  style={{ width: `${(metrics.pools / 50) * 100}%` }}
                                />
                              </div>
                              <span className="text-[8px] font-mono text-white/30 block text-right">Pool utilization: {((metrics.pools / 50) * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* Card 3: Memory Cache */}
                          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Memory Cache</span>
                              <Layers className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-mono font-bold text-white tracking-tight">{metrics.cache}MB</span>
                              <span className="text-[9px] font-mono text-white/40">/ 512MB max</span>
                            </div>
                            {/* Capacity gauge */}
                            <div className="space-y-1 pt-1">
                              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-accent-gold h-full transition-all duration-500" 
                                  style={{ width: `${(metrics.cache / 512) * 100}%` }}
                                />
                              </div>
                              <span className="text-[8px] font-mono text-white/30 block text-right">Cache allocation: {((metrics.cache / 512) * 100).toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* Card 4: Recall Accuracy */}
                          <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Knowledge Recall Accuracy</span>
                              <Brain className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-mono font-bold text-white tracking-tight">{metrics.accuracy}%</span>
                              <span className="text-[9px] font-mono text-accent-sage font-semibold uppercase">Exact Sync</span>
                            </div>
                            {/* Stability indicator */}
                            <div className="flex items-center gap-1.5 text-[8px] font-mono text-white/35 pt-2">
                              <Check className="w-3.5 h-3.5 text-accent-sage shrink-0" />
                              <span>Indexed across 12 sub-namespaces</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            </div>
          </motion.div>
        </section>

        {/* ── CORE CAPABILITIES GRID SECTION ── */}
        <section id="capabilities" className="py-20 md:py-28 px-6 border-t border-border/40 bg-card/10 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
          
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16 md:mb-24">
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3.5 block">Core Features</span>
              <h2 className="text-4xl md:text-5xl font-display text-foreground leading-tight">
                Simple Tools / <br />
                <span className="italic font-normal text-muted-foreground">Built for Daily Work</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {SYSTEM_CAPABILITIES.map((cap, i) => {
                const Icon = cap.icon;
                return (
                  <motion.div
                    key={cap.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className="group border border-border/50 rounded-2xl p-8 bg-card flex flex-col justify-between relative overflow-hidden transition-all hover:border-primary/30 shadow-[0_4px_30px_rgba(0,0,0,0.02)] hover:shadow-xl duration-300"
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl border ${cap.colorClass} ${cap.bgClass} transition-transform group-hover:scale-105`}>
                          <Icon className="w-5.5 h-5.5 stroke-[1.5px]" />
                        </div>
                        <span className="font-display italic text-3xl text-muted-foreground/35 select-none">{cap.num}</span>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                          {cap.title}
                        </h3>
                        <p className="font-display italic text-sm text-primary/75">
                          {cap.serifSubtitle}
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed font-light">
                        {cap.desc}
                      </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      <span>Learn More</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── TECHNICAL INFRASTRUCTURE DESIGN CARD ── */}
        <section className="py-20 md:py-24 px-6 border-t border-border/40 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Fast and Secure</span>
              <h2 className="text-3xl md:text-5xl font-display text-foreground leading-[1.1]">
                Runs locally, <br />
                <span className="italic font-normal text-muted-foreground">updates instantly.</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-[1.7] font-light">
                Our system separates planning from execution to keep things fast. Everything runs securely on your local machine, keeping your data private and your workspace highly responsive.
              </p>
              
              <div className="space-y-3 pt-3">
                {[
                  "Fast local responses under 12ms",
                  "Secure local database storage",
                  "Runs completely offline when needed",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs font-medium text-foreground">
                    <CheckCircle2 className="w-4.5 h-4.5 text-accent-sage shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="glass-panel border border-border/70 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden"
              >
                {/* Blueprint Design Accents */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-xs font-mono font-semibold tracking-wider uppercase text-foreground">How It Works</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">PROCESS WORKFLOW</span>
                </div>

                <div className="space-y-4 font-mono text-[11px] leading-relaxed">
                  
                  {/* Step 1 Box */}
                  <div className="p-3.5 bg-card/60 border border-border/80 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-primary/10 border border-primary/25 text-primary flex items-center justify-center font-bold text-[10px]">1</span>
                      <div>
                        <p className="font-semibold text-foreground">1. Write a Request</p>
                        <p className="text-[9px] text-muted-foreground font-light">Send a task to your assistants</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-accent-sage uppercase bg-accent-sage/10 px-2 py-0.5 rounded border border-accent-sage/20">REQUEST</span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="h-6 border-l-2 border-dashed border-border/80 ml-6 flex items-center" />

                  {/* Step 2 Box */}
                  <div className="p-3.5 bg-card/60 border border-border/80 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-primary/10 border border-primary/25 text-primary flex items-center justify-center font-bold text-[10px]">2</span>
                      <div>
                        <p className="font-semibold text-foreground">2. Smart Planning</p>
                        <p className="text-[9px] text-muted-foreground font-light">The coordinator plans how to solve the task</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-accent-ember uppercase bg-accent-ember/10 px-2 py-0.5 rounded border border-accent-ember/20">PLANNER</span>
                  </div>

                  {/* Flow Arrow */}
                  <div className="h-6 border-l-2 border-dashed border-border/80 ml-6 flex items-center" />

                  {/* Step 3 Box */}
                  <div className="p-3.5 bg-card/60 border border-border/80 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-primary/10 border border-primary/25 text-primary flex items-center justify-center font-bold text-[10px]">3</span>
                      <div>
                        <p className="font-semibold text-foreground">3. Clear Results</p>
                        <p className="text-[9px] text-muted-foreground font-light">Assistants complete the task and save the results</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-accent-gold uppercase bg-accent-gold/10 px-2 py-0.5 rounded border border-accent-gold/20">RESULTS</span>
                  </div>

                </div>
              </motion.div>
            </div>

          </div>
        </section>

      </main>

      {/* ── FOOTER: PRESTIGE FINISH ── */}
      <MarketingFooter />

    </div>
  );
}
