"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  Bot,
  Workflow,
  Lightbulb,
  BarChart3,
  Settings,
  TerminalSquare,
  ChevronLeft,
  ChevronRight,
  X,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useEffect } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",        href: "/dashboard" },
  { icon: User,            label: "Profile",          href: "/dashboard/profile" },
  { icon: Database,        label: "Database",         href: "/dashboard/memory" },
  { icon: Bot,             label: "Assistants",       href: "/dashboard/agents" },
  { icon: Workflow,        label: "Automations",      href: "/dashboard/automations" },
  { icon: Lightbulb,       label: "Notes",            href: "/dashboard/knowledge" },
  { icon: BarChart3,       label: "Analytics",        href: "/dashboard/analytics" },
  { icon: Settings,        label: "Settings",         href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebarStore();

  useEffect(() => {
    closeMobileSidebar();
  }, [pathname, closeMobileSidebar]);

  const SidebarContent = (
    <div className="flex flex-col h-full p-4">
      {/* Logo + Toggle Row */}
      <div className="flex items-center justify-between mb-8 px-1">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/25">
            <TerminalSquare className="w-4 h-4 text-primary" />
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-lg tracking-wide text-foreground font-display italic"
              >
                Cognitive OS
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Mobile close button */}
        <button
          onClick={closeMobileSidebar}
          className="md:hidden flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              title={!isOpen ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all group relative overflow-hidden transition-theme",
                isOpen ? "px-3 py-2.5" : "justify-center px-0 py-2.5",
                isActive
                  ? "text-foreground bg-primary/10 border border-primary/20 dark:bg-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
              )}
            >
              {/* Active left-border indicator */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}

              <item.icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-primary font-bold" : "text-muted-foreground group-hover:text-primary"
                )}
              />

              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Footer status block */}
      <div className="mt-auto pt-4 border-t border-border">
        <div
          className={cn(
            "rounded-xl bg-muted/40 border border-border transition-all",
            isOpen ? "p-3" : "p-2 flex justify-center"
          )}
        >
          {isOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground font-sans">System Load</span>
                <span className="text-xs font-mono text-primary font-medium">98.2%</span>
              </div>
              <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
                <div className="w-[98.2%] h-full bg-primary rounded-full" />
              </div>
            </motion.div>
          ) : (
            <div
              className="w-2 h-2 rounded-full bg-primary glow-dot"
              title="System Load: 98.2%"
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Animated Sidebar ── */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? 256 : 80 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="hidden md:flex flex-col h-screen border-r border-border glass-panel fixed left-0 top-0 z-40 transition-theme"
      >
        {SidebarContent}
      </motion.aside>

      {/* ── Mobile Backdrop ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* ── Mobile Drawer ── */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: isMobileOpen ? 0 : "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="md:hidden fixed left-0 top-0 bottom-0 w-64 glass-panel border-r border-border z-50 transition-theme"
      >
        {SidebarContent}
      </motion.aside>
    </>
  );
}
