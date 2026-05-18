import { Activity, Code, Search, CheckCircle } from "lucide-react";

const agents = [
  { id: "ag-1", name: "Coder-Agent", status: "executing", task: "Generating Next.js components", icon: Code, color: "text-blue-400" },
  { id: "ag-2", name: "Research-Agent", status: "idle", task: "Waiting for delegation", icon: Search, color: "text-emerald-400" },
];

export function AgentActivity() {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-sm">Agent Swarm Activity</h2>
        </div>
        <span className="flex items-center gap-2 text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-4">
        {agents.map((agent) => (
          <div key={agent.id} className="relative p-4 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {agent.status === "executing" && (
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[shimmer_2s_infinite]" />
            )}
            <div className="flex items-center gap-3 mb-2">
              <agent.icon className={`w-4 h-4 ${agent.color}`} />
              <span className="font-medium text-sm text-white/90">{agent.name}</span>
              <span className="ml-auto text-xs uppercase tracking-wider text-white/40">
                {agent.status}
              </span>
            </div>
            <p className="text-xs text-white/60 flex items-center gap-2">
              {agent.status === "executing" ? (
                <span className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-3 h-3 text-white/30" />
              )}
              {agent.task}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
