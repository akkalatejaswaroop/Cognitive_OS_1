"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Terminal, Cpu, Database, Network } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center max-w-4xl px-4"
      >
        <div className="mb-6 flex justify-center">
          <div className="glass p-4 rounded-2xl">
            <Cpu className="w-12 h-12 text-blue-400 animate-pulse-slow" />
          </div>
        </div>
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-white/50 text-glow">
          Cognitive OS
        </h1>
        <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto font-light">
          The autonomous multi-agent operating system. Persistent memory, real-time orchestration, and hyper-intelligent execution.
        </p>

        <div className="flex items-center justify-center gap-6">
          <Link href="/dashboard">
            <button className="group relative px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full font-medium transition-all duration-300 backdrop-blur-md overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Initialize System
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: Network, title: "Agent Orchestration", desc: "Dynamic delegation and execution of complex workflows." },
            { icon: Database, title: "Persistent Memory", desc: "Semantic retrieval using ChromaDB and vector spaces." },
            { icon: Terminal, title: "Real-time Execution", desc: "Live streaming of agent thoughts and tool usage." }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
              className="glass-panel p-6 rounded-2xl"
            >
              <feature.icon className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">{feature.title}</h3>
              <p className="text-white/50 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
