import Link from "next/link";
import { Terminal, Database, Activity, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Terminal, label: "Terminal", href: "/dashboard/terminal" },
  { icon: Database, label: "Memory Bank", href: "/dashboard/memory" },
  { icon: Activity, label: "Agent Swarm", href: "/dashboard/agents" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function Sidebar() {
  return (
    <aside className="w-64 h-screen border-r border-white/10 glass-panel flex flex-col p-4 fixed left-0 top-0 z-40">
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse-slow" />
        </div>
        <span className="font-semibold text-lg tracking-wide text-white">COGNI OS</span>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all group"
          >
            <item.icon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-white/50">System Load</span>
          <span className="text-xs text-blue-400">24%</span>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="w-1/4 h-full bg-blue-500 rounded-full" />
        </div>
      </div>
    </aside>
  );
}
