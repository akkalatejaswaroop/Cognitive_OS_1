"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

import { cardHover } from "@/lib/animations";

export interface DashboardCardProps {
  title: string;
  icon: ReactNode;
  iconColor?: "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan" | "gray";
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  gradientHover?: boolean;
}

// Tailwind-safe static classes per color
const colorMap = {
  blue:    { icon: "bg-blue-500/10 border-blue-500/20 text-blue-500",   glow: "bg-blue-500/8 group-hover:bg-blue-500/15" },
  purple:  { icon: "bg-purple-500/10 border-purple-500/20 text-purple-400", glow: "bg-purple-500/8 group-hover:bg-purple-500/15" },
  emerald: { icon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", glow: "bg-emerald-500/8 group-hover:bg-emerald-500/15" },
  amber:   { icon: "bg-amber-500/10 border-amber-500/20 text-amber-400", glow: "bg-amber-500/8 group-hover:bg-amber-500/15" },
  rose:    { icon: "bg-rose-500/10 border-rose-500/20 text-rose-400",   glow: "bg-rose-500/8 group-hover:bg-rose-500/15" },
  cyan:    { icon: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",   glow: "bg-cyan-500/8 group-hover:bg-cyan-500/15" },
  gray:    { icon: "bg-foreground/5 border-border text-foreground/60",  glow: "bg-foreground/3 group-hover:bg-foreground/8" },
};

export function DashboardCard({
  title,
  icon,
  iconColor = "blue",
  action,
  children,
  className,
  gradientHover = true,
}: DashboardCardProps) {
  const color = colorMap[iconColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={cardHover.whileHover}
      whileTap={cardHover.whileTap}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "glass-panel rounded-xl p-5 border border-border relative overflow-hidden group flex flex-col h-full cursor-default select-none transition-theme",
        className
      )}
    >
      {/* Ambient colour glow */}
      {gradientHover && (
        <div
          className={cn(
            "absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none transition-colors duration-500",
            color.glow
          )}
        />
      )}

      {/* Card header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg border transition-colors", color.icon)}>
            {icon}
          </div>
          <h2 className="text-base font-semibold text-foreground tracking-wide">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Card content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </motion.div>
  );
}
