"use client";

import React from "react";
import { motion } from "framer-motion";
import { Scale, ShieldCheck, ScrollText } from "lucide-react";
import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingFooter } from "@/components/MarketingFooter";

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Agreement",
      content:
        "By initializing, installing, or interacting with the Cognitive OS software, platform, or dashboard, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, do not access or use the platform.",
    },
    {
      title: "2. License Grant & Usage",
      content:
        "Subject to compliance with these terms and payment of any applicable subscription tier fees, Cognitive OS grants you a non-exclusive, non-transferable, revocable license to utilize the local workspace coordination engine. You agree not to decompile, reverse-engineer, or attempt to extract the source code of the local orchestration systems unless explicitly permitted under local applicable law.",
    },
    {
      title: "3. Local Execution & Data Isolation",
      content:
        "Cognitive OS operates primarily as a local-first computing environment. Your workspace data, notes, agent logs, and security parameters are processed and stored on your physical hardware. We do not maintain server-side backups of your isolated local databases. You are solely responsible for executing periodic backups and securing your local environment keychains.",
    },
    {
      title: "4. Subscriptions, Fees, & Renewals",
      content:
        "Paid subscription tiers (such as the Professional Plan) are billed in advance on a recurring monthly or annual cycle. Charges are automatically processed using the payment credential on file. You may cancel your subscription at any time; however, pre-paid fees are non-refundable unless specified otherwise by local consumer protection statutes.",
    },
    {
      title: "5. Intellectual Property",
      content:
        "The software, custom design systems, branding motifs, layout configurations, and coordinating agent models are the exclusive intellectual property of Cognitive OS. Your custom data, processed materials, and notes generated through the platform remain exclusively your property.",
    },
    {
      title: "6. Limitation of Liability",
      content:
        "To the maximum extent permitted by law, Cognitive OS provides its software 'as-is' and 'as-available' without warranties of any kind. We shall not be liable for any direct, indirect, incidental, or consequential damages resulting from local database corruption, local system performance issues, or unauthorized access to your physical hardware.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-grid font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
        <div className="absolute top-1/4 left-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] opacity-40 dark:opacity-20 animate-float" />
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
            <ScrollText className="w-3.5 h-3.5" />
            Legal Documentation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl tracking-tight font-display text-foreground mb-6"
          >
            Terms of Service
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
              Welcome to Cognitive OS. Please read these terms carefully before deploying or interacting with our local multi-agent operating system.
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
              <Scale className="w-4 h-4 text-primary" />
              <span>Governing Jurisdiction: Delaware, US</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Certified Secure Framework</span>
            </div>
          </div>
        </motion.div>
      </main>

      <MarketingFooter />
    </div>
  );
}
