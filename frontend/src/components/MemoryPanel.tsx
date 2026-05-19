"use client";

import { useState, useEffect } from "react";
import { Database, FileText, Link as LinkIcon, Search, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";

interface MemoryEntry {
  id: string;
  type: string;
  title: string;
  content: string;
  relevance: number;
}

const defaultMemories: MemoryEntry[] = [
  { id: "1", type: "document", title: "Project Alpha Architecture", content: "Architecture details for enterprise setup", relevance: 0.98 },
  { id: "2", type: "interaction", title: "Past UI configuration discussion", content: "Notes on branding, aesthetics, and colors", relevance: 0.85 },
  { id: "3", type: "link", title: "API Documentation (Stripe)", content: "Endpoint integrations for Stripe payments", relevance: 0.72 },
];

export function MemoryPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [memories, setMemories] = useState<MemoryEntry[]>(defaultMemories);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMemories = async (queryText: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient("/api/v1/memory/query", {
        method: "POST",
        body: JSON.stringify({
          query: queryText || "cognitive systems",
          n_results: 5,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to query vector database");
      }

      const responseData = await res.json();
      const results = responseData.data;

      if (results && results.ids && results.ids[0] && results.ids[0].length > 0) {
        const mappedMemories: MemoryEntry[] = results.ids[0].map((id: string, idx: number) => {
          const document = results.documents[0][idx] || "";
          const distance = results.distances[0][idx] ?? 0;
          const metadata = results.metadatas[0][idx] || {};
          
          // Convert distance (cosine/L2) to simple relevance %
          const relevance = Math.max(0.01, Math.min(0.99, 1 - distance));
          
          return {
            id,
            type: metadata.type || "document",
            title: metadata.title || document.substring(0, 30) + "...",
            content: document,
            relevance,
          };
        });
        
        // Sort by relevance high to low
        mappedMemories.sort((a, b) => b.relevance - a.relevance);
        setMemories(mappedMemories);
      } else {
        // No results found
        if (queryText) {
          setMemories([]);
        } else {
          setMemories(defaultMemories);
        }
      }
    } catch (err) {
      console.error("Vector database query error:", err);
      // Fallback on failure
      if (!queryText) {
        setMemories(defaultMemories);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Perform initial vector database retrieval on mount
    fetchMemories("");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(searchQuery);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-full bg-white/5">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-5 h-5 text-purple-400" />
        <h2 className="font-semibold text-sm">Long-term Vector Memory</h2>
      </div>

      {/* Vector search bar */}
      <form onSubmit={handleSearch} className="mb-4 relative flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vector database..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-white/30"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 rounded-xl transition-all flex items-center justify-center shrink-0 disabled:bg-white/10"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
        </button>
      </form>

      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-white/40 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            <span className="text-xs">Querying vectors...</span>
          </div>
        )}

        {!isLoading && memories.length === 0 && (
          <div className="text-center py-8 text-white/40 text-xs">
            No memories found matching your search.
          </div>
        )}

        {!isLoading && memories.map((entry) => (
          <div key={entry.id} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-1.5">
              <div className="flex items-center gap-2 overflow-hidden">
                {entry.type === "document" ? <FileText className="w-3.5 h-3.5 text-blue-400" /> : <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="text-xs font-semibold text-white/90 group-hover:text-purple-300 transition-colors truncate">{entry.title}</span>
              </div>
              <span className="text-[10px] text-purple-300 font-mono bg-purple-500/20 px-1.5 py-0.5 rounded">
                {(entry.relevance * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] text-white/40 line-clamp-2 mb-2 leading-relaxed font-light">
              {entry.content}
            </p>
            <div className="w-full bg-white/10 h-0.5 rounded-full overflow-hidden">
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
