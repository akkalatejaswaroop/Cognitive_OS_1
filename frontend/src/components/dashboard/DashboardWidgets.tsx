"use client";

import {
  BrainCircuit,
  CheckCircle2,
  Sparkles,
  Database,
  LineChart,
  Plus,
  ArrowRight,
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";

/* ──────────────────────────────────────────────────────────────
   1. Cognitive Summary
────────────────────────────────────────────────────────────── */
export function CognitiveSummaryWidget() {
  return (
    <DashboardCard
      title="Workspace Overview"
      icon={<BrainCircuit className="w-5 h-5" />}
      iconColor="blue"
    >
      <div className="space-y-4 flex flex-col justify-between h-full">
        <div>
          <div className="text-3xl font-extralight text-foreground mb-1">High</div>
          <div className="text-xs text-muted-foreground">Workspace Efficiency</div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border mt-auto">
          <div>
            <div className="text-lg font-semibold text-foreground/90">2.4s</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Avg Response Time</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground/90">842</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Actions Completed</div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   2. AI Recommendations
────────────────────────────────────────────────────────────── */
export function AIRecommendationsWidget() {
  const recommendations = [
    { id: 1, text: "Expand workspace history for task #402." },
    { id: 2, text: "Duplicate notes detected. Clean up workspace memory?" },
  ];

  return (
    <DashboardCard
      title="Workspace Insights"
      icon={<Sparkles className="w-5 h-5" />}
      iconColor="purple"
    >
      <div className="space-y-3 mt-auto">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-3 bg-muted/40 hover:bg-muted/80 rounded-lg border border-border hover:border-primary/25 transition-colors cursor-pointer group/item"
          >
            <p className="text-xs text-foreground/80 leading-relaxed group-hover/item:text-foreground transition-colors">
              {rec.text}
            </p>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   3. Productivity Insights
────────────────────────────────────────────────────────────── */
export function ProductivityInsightsWidget() {
  const dataPoints = [40, 70, 45, 90, 65, 85, 100];

  return (
    <DashboardCard
      title="Productivity"
      icon={<LineChart className="w-5 h-5" />}
      iconColor="emerald"
      className="md:col-span-2 xl:col-span-1"
    >
      <div className="h-[100px] flex items-end gap-2 pt-4 mt-auto">
        {dataPoints.map((val, i) => (
          <div
            key={i}
            className="flex-1 bg-muted hover:bg-primary/20 transition-all rounded-t-sm group/bar relative"
            style={{ height: `${val}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap bg-card border border-border px-1 rounded shadow-sm z-10">
              {val}%
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   4. Active Tasks
────────────────────────────────────────────────────────────── */
export function ActiveTasksWidget() {
  const activeTasks = [
    { id: 1, title: "Optimize system settings", status: "In Progress", progress: 65 },
    { id: 2, title: "Import document backlog", status: "Queued", progress: 0 },
    { id: 3, title: "Clean up storage", status: "Completed", progress: 100 },
  ];

  return (
    <DashboardCard
      title="Active Tasks"
      icon={<CheckCircle2 className="w-5 h-5" />}
      iconColor="rose"
      action={
        <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      }
    >
      <div className="space-y-4">
        {activeTasks.map((task) => (
          <div key={task.id} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-foreground/80 font-medium">{task.title}</span>
              <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">{task.status}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-primary"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   5. Recent Memories
────────────────────────────────────────────────────────────── */
export function RecentMemoriesWidget() {
  const recentMemories = [
    { id: 1, title: "Project Alpha Architecture", type: "Document", time: "2h ago" },
    { id: 2, title: "Client Feedback Meeting", type: "Transcript", time: "5h ago" },
    { id: 3, title: "Workspace settings updated", type: "System", time: "1d ago" },
  ];

  return (
    <DashboardCard
      title="Recent Notes"
      icon={<Database className="w-5 h-5" />}
      iconColor="blue"
      action={
        <button className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium">
          Browse Notes <ArrowRight className="w-3 h-3" />
        </button>
      }
    >
      <div className="space-y-2">
        {recentMemories.map((memory) => (
          <div
            key={memory.id}
            className="flex items-center justify-between p-3 bg-muted/30 border border-border hover:border-primary/20 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 group-hover:bg-primary transition-colors shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-foreground/90 truncate">{memory.title}</div>
                <div className="text-[10px] text-muted-foreground">{memory.type}</div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground shrink-0 pl-2">{memory.time}</div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

/* ──────────────────────────────────────────────────────────────
   6. Quick Thought Capture
────────────────────────────────────────────────────────────── */
export function QuickThoughtCaptureWidget() {
  return (
    <div className="glass-panel rounded-xl p-1 border border-border flex items-center focus-within:ring-1 focus-within:ring-primary/40 transition-shadow">
      <div className="pl-3">
        <Plus className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <input
        type="text"
        placeholder="Quickly note a task or observation…"
        className="flex-1 bg-transparent border-none focus:outline-none text-xs text-foreground px-2.5 py-2.5 placeholder:text-muted-foreground/50 min-w-0"
      />
      <button className="px-3 py-1.5 mr-1 bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-semibold uppercase tracking-wider rounded-lg transition-colors shrink-0">
        Save
      </button>
    </div>
  );
}
