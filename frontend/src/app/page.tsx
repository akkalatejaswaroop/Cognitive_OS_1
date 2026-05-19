"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Terminal, Cpu, Database, Network } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-grid">
      {/* Background Orbs — theme-aware */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[200px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center max-w-4xl px-4"
      >
        {/* CPU Icon */}
        <div className="mb-6 flex justify-center">
          <div className="glass p-4 rounded-2xl glow-ring">
            <Cpu className="w-12 h-12 text-primary animate-pulse-slow" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 gradient-text-purple text-glow">
          Cognitive OS
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-light">
          The autonomous multi-agent operating system. Persistent memory,
          real-time orchestration, and hyper-intelligent execution.
        </p>

        {/* CTA Button */}
        <div className="flex items-center justify-center gap-6">
          <Link href="/dashboard">
            <button className="group relative px-8 py-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-full font-medium transition-all duration-300 backdrop-blur-md overflow-hidden text-foreground">
              <span className="relative z-10 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Initialize System
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: Network,
              title: "Agent Orchestration",
              desc: "Dynamic delegation and execution of complex workflows.",
              glow: "glow-ring",
            },
            {
              icon: Database,
              title: "Persistent Memory",
              desc: "Semantic retrieval using ChromaDB and vector spaces.",
              glow: "glow-ring-purple",
            },
            {
              icon: Terminal,
              title: "Real-time Execution",
              desc: "Live streaming of agent thoughts and tool usage.",
              glow: "glow-ring-cyan",
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="glass-panel p-6 rounded-2xl surface-interactive group"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4 group-hover:text-accent transition-colors" />
              <h3 className="text-lg font-medium mb-2 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
