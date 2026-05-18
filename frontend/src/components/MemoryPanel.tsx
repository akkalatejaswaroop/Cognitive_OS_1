import { Database, FileText, Link as LinkIcon } from "lucide-react";

const memoryEntries = [
  { id: 1, type: "document", title: "Project Alpha Architecture", relevance: 0.98 },
  { id: 2, type: "interaction", title: "Past UI configuration discussion", relevance: 0.85 },
  { id: 3, type: "link", title: "API Documentation (Stripe)", relevance: 0.72 },
];

export function MemoryPanel() {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-5 h-5 text-purple-400" />
        <h2 className="font-semibold text-sm">Active Memory Context</h2>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2">
        {memoryEntries.map((entry) => (
          <div key={entry.id} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {entry.type === "document" ? <FileText className="w-4 h-4 text-blue-400" /> : <LinkIcon className="w-4 h-4 text-emerald-400" />}
                <span className="text-sm font-medium text-white/90 group-hover:text-blue-300 transition-colors">{entry.title}</span>
              </div>
              <span className="text-xs text-purple-300 font-mono bg-purple-500/20 px-1.5 py-0.5 rounded">
                {entry.relevance.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500" 
                style={{ width: `${entry.relevance * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
