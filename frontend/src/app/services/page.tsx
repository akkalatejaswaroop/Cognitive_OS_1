"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, Terminal, Shield, Sparkles, Network, Database } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function ServicesPage() {
  const services = [
    {
      icon: Cpu,
      title: "Workspace Orchestration Engine",
      tagline: "Total Context Mastery",
      description:
        "Automatically links your markdown journals, software codebase directories, project databases, and terminal environments into a unified memory map. The operating system handles complex metadata so you do not have to.",
    },
    {
      icon: Terminal,
      title: "Natural Language Terminal Execution",
      tagline: "No Complex Syntax Required",
      description:
        "Speak to your physical filesystem in natural English. Ask Cognitive OS to coordinate git workflows, perform multi-file search and replace, configure build systems, and execute commands safely.",
    },
    {
      icon: Network,
      title: "Local Agent Coordination (Multi-Agent)",
      tagline: "Collaborative Intelligence",
      description:
        "Instantiate specific agent profiles configured for specialized tasks (e.g. system design, QA, code refactoring, content synthesis) working in parallel to solve complex developer workflows.",
    },
    {
      icon: Shield,
      title: "Isolated Local Model Sandboxing",
      tagline: "Zero-Telemetry Standard",
      description:
        "Run inference fully on your local CPU or GPU. Prevent proprietary logic, secret keys, or sensitive customer databases from ever leaving your device boundaries. Built for highly regulated industries.",
    },
    {
      icon: Database,
      title: "Semantic Vector Database Indexing",
      tagline: "Ultra-Fast Memory Access",
      description:
        "High-performance local vector database indexing that continuously parses your active codebase and documents, rendering precise relevant context instantly to local agent nodes.",
    },
    {
      icon: Sparkles,
      title: "Adaptive Interface Synthesizer",
      tagline: "Interactive UI Rendering",
      description:
        "Instantly generates custom, beautiful interactive visual panels, controllers, and dashboards dynamically as your active workflow requires them. Fluid, reactive, and styled exactly to our custom rules.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-grid font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Decorative Blur Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-1/6 left-20 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] opacity-40 dark:opacity-20 animate-float" />
        <div className="absolute top-1/3 right-20 w-[500px] h-[500px] bg-foreground/5 rounded-full blur-[140px] opacity-20 dark:opacity-10 animate-float-delayed" />
      </div>

      <MarketingHeader />

      <main className="flex-grow z-10 py-16 md:py-24 max-w-6xl mx-auto px-6">
        {/* Intro Section */}
        <div className="text-center max-w-3xl mx-auto mb-20 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Capabilities & Architecture
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl tracking-tight font-display text-foreground mb-6"
          >
            Capabilities of Cognitive OS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-sm md:text-base text-muted-foreground leading-relaxed font-light"
          >
            A high-performance local-first platform designed to orchestrate your workspace documents, compile codebases, and coordinate multi-agent AI execution securely on your physical device.
          </motion.p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.08 }}
                className="group relative border border-border/60 bg-card rounded-2xl p-8 hover:bg-card/85 duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.01)] hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-6 group-hover:scale-110 duration-300">
                    <Icon className="w-5 h-5 stroke-[1.5]" />
                  </div>
                  <p className="text-[10px] font-mono tracking-widest uppercase text-primary/80 mb-2">
                    {service.tagline}
                  </p>
                  <h3 className="text-lg font-bold text-foreground mb-3">{service.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-light">
                    {service.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
