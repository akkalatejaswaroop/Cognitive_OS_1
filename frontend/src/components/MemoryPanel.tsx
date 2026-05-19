"use client";

import { useState, useEffect } from "react";
import { Database, FileText, Link as LinkIcon, Search, Loader2, Cpu, Sparkles, Tag, Layers, Network } from "lucide-react";
import { apiClient } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MemoryEntry {
  id: string;
  type: string;
  title: string;
  content: string;
  relevance: number;
}

const defaultMemories: MemoryEntry[] = [
  { id: "1", type: "document", title: "Project Alpha Architecture", content: "Architecture details for enterprise setup with high scalability constraints", relevance: 0.98 },
  { id: "2", type: "interaction", title: "Past UI configuration discussion", content: "Notes on branding, aesthetics, warm amber themes, and serif styling", relevance: 0.85 },
  { id: "3", type: "link", title: "API Documentation (Stripe)", content: "Endpoint integrations for Stripe payments and webhook signature verification", relevance: 0.72 },
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
        throw new Error("Failed to query knowledge vault");
      }

      const responseData = await res.json();
      const results = responseData.data;

      if (results && results.ids && results.ids[0] && results.ids[0].length > 0) {
        const mappedMemories: MemoryEntry[] = results.ids[0].map((id: string, idx: number) => {
          const document = results.documents[0][idx] || "";
          const distance = results.distances[0][idx] ?? 0;
          const metadata = results.metadatas[0][idx] || {};
          
          // Convert distance to simple relevance %
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
        if (queryText) {
          setMemories([]);
        } else {
          setMemories(defaultMemories);
        }
      }
    } catch (err) {
      console.error("Knowledge vault query error:", err);
      if (!queryText) {
        setMemories(defaultMemories);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories("");
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(searchQuery);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-border flex flex-col h-full shadow-sm">
      
      {/* ── PANEL HEADER ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-foreground/10 border border-foreground/20 text-foreground">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-xs tracking-wider uppercase text-foreground/90 font-mono">Knowledge Vault</h2>
            <p className="text-[9px] text-muted-foreground font-light">Query documents and system records</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-foreground/10 border border-foreground/20 text-[9px] font-mono font-bold uppercase tracking-wider text-foreground dark:text-primary shrink-0">
          <Network className="w-3 h-3 text-foreground dark:text-primary" />
          System Vault
        </div>
      </div>

      {/* ── SEARCH TOOL ── */}
      <form onSubmit={handleSearch} className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents and records..."
            className="w-full bg-muted/40 border border-border/80 rounded-xl pl-9 pr-4 py-3 text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/40 text-foreground font-sans font-light"
          />
          <Search className="absolute left-3 top-3.5 w-3.5 h-3.5 text-muted-foreground/35" />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "text-xs px-4 rounded-xl transition-all duration-300 font-semibold border flex items-center justify-center shrink-0 shadow-sm",
            isLoading 
              ? "bg-muted border-border/80 text-muted-foreground/35 cursor-not-allowed" 
              : "bg-secondary text-secondary-foreground border-secondary/20 hover:bg-secondary/90 hover:shadow-md cursor-pointer"
          )}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Query"}
        </button>
      </form>

      {/* ── DOCUMENT NODES LIST ── */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-foreground" />
              <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-muted-foreground/75">Searching database records...</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs font-light">
              <Sparkles className="w-5 h-5 mx-auto mb-2 text-muted-foreground/30" />
              No matching records found in database.
            </div>
          ) : (
            <div className="space-y-3.5">
              {memories.map((entry) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  key={entry.id}
                  className="p-4 bg-card border border-border/80 rounded-2xl hover:border-primary/20 transition-all cursor-pointer group shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={cn(
                        "p-2 rounded-lg border shrink-0 transition-colors bg-foreground/10 text-foreground border-foreground/20"
                      )}>
                        {entry.type === "document" ? <FileText className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-foreground/90 group-hover:text-primary transition-colors truncate block">{entry.title}</span>
                        <span className="text-[9px] font-mono text-muted-foreground/65 capitalize">{entry.type} Node</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[10px] text-foreground font-mono font-bold bg-muted border border-border px-2 py-0.5 rounded-full">
                        {(entry.relevance * 100).toFixed(0)}% Match
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed font-light font-sans group-hover:text-foreground/90 transition-colors">
                    {entry.content}
                  </p>
                  
                  {/* Relevance bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-mono uppercase tracking-wider text-muted-foreground/65">
                      <span>Relevance Score</span>
                      <span>{(entry.relevance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-muted h-1 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-foreground rounded-full transition-all duration-700" 
                        style={{ width: `${entry.relevance * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
      
    </div>
  );
}
