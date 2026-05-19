"use client";

import React from "react";
import Link from "next/link";
import { Brain } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="z-10 border-t border-border/40 bg-[#FAF8F5]/30 dark:bg-[#141210]/30 py-16 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
        {/* Logo and About */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <Brain className="w-4 h-4" />
            </div>
            <span className="font-display italic text-base font-bold text-foreground">
              Cognitive <span className="font-sans not-italic text-xs font-semibold uppercase tracking-widest text-primary">OS</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed font-light">
            A premium, high-density coordinated workspace designed to run locally, securely, and with high response speeds.
          </p>
        </div>

        {/* Product Column */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Product</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <Link href="/services" className="hover:text-primary transition-colors">
                Services & Features
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-primary transition-colors">
                Pricing Options
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-primary transition-colors">
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal Column */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Legal</h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Column */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary">System</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-light">Latency: &lt; 12ms</p>
            <p className="font-light">Status: Fully Operational</p>
            <div>
              <span className="text-[9px] font-mono bg-muted px-2 py-0.5 rounded text-foreground">v1.0.4</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto border-t border-border/40 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[11px] text-muted-foreground font-light">
          © {new Date().getFullYear()} Cognitive OS. All rights reserved. Made for secure workspaces.
        </p>
        <div className="flex items-center gap-6 text-[11px] text-muted-foreground">
          <Link href="/services" className="hover:text-primary transition-colors">Services</Link>
          <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
