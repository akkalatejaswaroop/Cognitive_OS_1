"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, ChevronRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/pricing", label: "Pricing" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
  ];

  return (
    <header className="z-50 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 px-6 py-4 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between transition-theme">
      <div className="flex items-center justify-between w-full md:w-auto">
        {/* Brand logo */}
        <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary transition-transform group-hover:scale-105">
            <Brain className="w-5 h-5" />
          </div>
          <span className="font-display italic text-lg font-bold tracking-tight text-foreground">
            Cognitive <span className="font-sans not-italic text-sm font-semibold uppercase tracking-widest text-primary">OS</span>
          </span>
        </Link>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-border bg-card/50 text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main navigation links (Desktop) */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "hover:text-primary transition-colors relative py-1",
                isActive ? "text-primary font-semibold" : ""
              )}
            >
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Desktop Controls & Call to Action */}
      <div className="hidden md:flex items-center gap-4">
        <ThemeToggle />
        <Link href="/signup">
          <button className="relative group overflow-hidden px-4.5 py-2 bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917] hover:opacity-90 font-semibold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95 cursor-pointer">
            <span className="relative z-10 flex items-center gap-2">
              Sign Up
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </Link>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden flex flex-col gap-4 pt-4 pb-2 border-t border-border/40 mt-4 animate-in fade-in slide-in-from-top-5 duration-200">
          <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-muted/40",
                    isActive ? "text-primary font-semibold bg-muted/60" : ""
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="w-full">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-foreground text-background dark:bg-[#FAF8F5] dark:text-[#1C1917] font-semibold text-xs uppercase tracking-wider rounded-xl transition-all duration-300">
                Sign Up
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

