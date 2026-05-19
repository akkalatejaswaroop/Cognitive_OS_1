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
  blue:    { icon: "bg-primary/10 border-primary/20 text-primary",   glow: "bg-primary/[0.04] group-hover:bg-primary/[0.08]" },
  purple:  { icon: "bg-primary/10 border-primary/20 text-primary",   glow: "bg-primary/[0.04] group-hover:bg-primary/[0.08]" },
  emerald: { icon: "bg-foreground/5 border-border text-muted-foreground", glow: "bg-foreground/[0.02] group-hover:bg-foreground/[0.04]" },
  amber:   { icon: "bg-primary/10 border-primary/20 text-primary",   glow: "bg-primary/[0.04] group-hover:bg-primary/[0.08]" },
  rose:    { icon: "bg-primary/10 border-primary/20 text-primary",   glow: "bg-primary/[0.04] group-hover:bg-primary/[0.08]" },
  cyan:    { icon: "bg-primary/10 border-primary/20 text-primary",   glow: "bg-primary/[0.04] group-hover:bg-primary/[0.08]" },
  gray:    { icon: "bg-foreground/5 border-border text-foreground/60",  glow: "bg-foreground/[0.02] group-hover:bg-foreground/[0.05]" },
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
