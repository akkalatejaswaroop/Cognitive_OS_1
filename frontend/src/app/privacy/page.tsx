"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, EyeOff, KeyRound } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Our Core Principle: Complete Data Isolation",
      content:
        "Unlike traditional SaaS systems, Cognitive OS enforces complete local isolation. All workspace documents, custom files, knowledge maps, and agent interaction histories are processed and retained directly on your physical hardware. We do not transmit or cache this data on external cloud clusters.",
    },
    {
      title: "2. Information We Do Not Collect",
      content:
        "We do not collect, process, or view the contents of your local documents, workspace databases, search inputs, personal credentials, or local environment configurations. Your workspace is yours alone, protected entirely within your system memory boundaries.",
    },
    {
      title: "3. Information We Collect for Platform Operations",
      content:
        "To manage license validation, billing integrations, and account authentication, we collect basic administrative telemetry. This includes: user email address, payment credential identifiers (processed securely via Stripe), license keys, and aggregate operational errors to ensure workspace compatibility.",
    },
    {
      title: "4. Third-Party Service Integrations",
      content:
        "If you explicitly configure third-party services—such as external LLM providers or remote Git repositories—your local agents will interact with their APIs directly from your machine. These interactions are bound by the privacy policies of those individual services; we do not broker or intercept these API payloads.",
    },
    {
      title: "5. Security Protocols",
      content:
        "Your local files are secured by standard physical filesystem access controls and operating system sandboxing. We recommend configuring local disk encryption (such as BitLocker or FileVault) to protect your workspace in the event of hardware loss.",
    },
    {
      title: "6. Changes to this Policy",
      content:
        "We may periodically update this Privacy Policy to reflect modifications in software behavior or compliance requirements. Any revisions will be announced via this page, with an updated revision date listed above.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-grid font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-1/4 right-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] opacity-40 dark:opacity-20 animate-float" />
      </div>

      <MarketingHeader />

      <main className="flex-grow z-10 py-16 md:py-24 max-w-4xl mx-auto px-6">
        {/* Header Block */}
        <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-widest text-primary mb-6"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Privacy Framework
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl tracking-tight font-display text-foreground mb-6"
          >
            Privacy Policy
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xs font-mono tracking-widest uppercase text-muted-foreground"
          >
            Last Updated: May 19, 2026
          </motion.p>
        </div>

        {/* Content Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="border border-border/60 bg-card rounded-2xl p-8 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.01)] hover:shadow-xl duration-300 space-y-10"
        >
          <div className="prose dark:prose-invert max-w-none space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed font-light">
              This policy outlines how Cognitive OS protects your privacy. Our design is simple: <strong>your data belongs to you, and remains on your device.</strong>
            </p>
          </div>

          <div className="space-y-8 pt-6 border-t border-border/40">
            {sections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-base font-bold text-foreground">{section.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-light">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
              <EyeOff className="w-4 h-4 text-primary" />
              <span>Zero-Telemetry Local Core</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
              <KeyRound className="w-4 h-4 text-primary" />
              <span>Zero Knowledge Design</span>
            </div>
          </div>
        </motion.div>
      </main>

      <MarketingFooter />
    </div>
  );
}
