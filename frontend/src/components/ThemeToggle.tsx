"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type ThemeOption = "light" | "dark" | "system";

const themeOptions: {
  value: ThemeOption;
  icon: React.FC<{ className?: string }>;
  label: string;
  description: string;
}[] = [
  { value: "light", icon: Sun, label: "Light", description: "Bright & clean" },
  { value: "dark", icon: Moon, label: "Dark", description: "Deep space mode" },
  { value: "system", icon: Monitor, label: "System", description: "Match your OS" },
];

/* ─────────────────────────────────────────────────────────────
   ThemeToggle — Inline cycling button for Navbar
───────────────────────────────────────────────────────────── */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR guard
    setMounted(true);
  }, []);

  // Render placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <div
        className={cn(
          "w-9 h-9 rounded-full bg-muted/15",
          className
        )}
      />
    );
  }

  const current = (theme as ThemeOption) ?? "dark";
  const isDark = theme === "dark";

  const cycle = () => {
    const order: ThemeOption[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setTheme(next);
  };

  return (
    <button
      id="theme-toggle-button"
      onClick={cycle}
      title={`Theme: ${current}`}
      aria-label={`Current theme: ${current}. Click to switch.`}
      className={cn(
        "relative p-2 rounded-full transition-colors overflow-hidden",
        "text-foreground/60 hover:text-foreground",
        "hover:bg-foreground/5",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex items-center justify-center"
        >
          {current === "light" && (
            <Sun className="w-5 h-5 text-amber-500 dark:text-amber-400" />
          )}
          {current === "dark" && (
            <Moon className="w-5 h-5 text-primary" />
          )}
          {current === "system" && (
            <Monitor className="w-5 h-5 text-muted-foreground" />
          )}
        </motion.span>
      </AnimatePresence>

      {/* Ambient glow behind icon in dark mode */}
      {isDark && (
        <div className="absolute inset-0 rounded-full bg-primary/5 pointer-events-none" />
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   ThemeSegmentedControl — 3-way selector for Settings pages
───────────────────────────────────────────────────────────── */
export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR guard
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 gap-1 rounded-xl border border-border",
        "bg-muted/30 dark:bg-muted/20",
        className
      )}
    >
      {themeOptions.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="theme-segment-active"
                className="absolute inset-0 rounded-lg bg-primary/15 border border-primary/25 dark:bg-primary/20 dark:border-primary/30"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <Icon
              className={cn(
                "w-4 h-4 relative z-10",
                isActive && "text-primary"
              )}
            />
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ThemeDropdown — Full dropdown menu with descriptions
   Use in settings panels or preference modals.
───────────────────────────────────────────────────────────── */
export function ThemeDropdown({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR guard
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) return null;

  const current = themeOptions.find((t) => t.value === theme) ?? themeOptions[1];
  const CurrentIcon = current.icon;

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border border-border",
          "bg-card hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
        )}
      >
        <CurrentIcon className="w-4 h-4 text-primary" />
        <span>{current.label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 w-56 rounded-xl border border-border glass-panel shadow-2xl py-1 z-50"
          >
            {themeOptions.map(({ value, icon: Icon, label, description }) => {
              const isActive = theme === value;
              return (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 mt-0.5 flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{description}</div>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
