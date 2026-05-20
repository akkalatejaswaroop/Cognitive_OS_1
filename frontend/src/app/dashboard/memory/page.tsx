"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { 
  Database, Search, Trash2, HardDrive, 
  Cpu, Layers, Sparkles, Filter, RefreshCw
} from "lucide-react"
import { AuthGuard } from "@/components/AuthGuard"

// Mock database documents
const initialMemories = [
  { id: "mem-1", text: "Cognitive OS architecture guidelines & styles", size: "12 KB", type: "vector", date: "2026-05-19" },
  { id: "mem-2", text: "Next.js 14 App Router integration details", size: "45 KB", type: "document", date: "2026-05-18" },
  { id: "mem-3", text: "Supabase authentication secrets and config keys", size: "3.5 KB", type: "keyvalue", date: "2026-05-20" },
  { id: "mem-4", text: "User profile preferences metadata overrides", size: "1.2 KB", type: "metadata", date: "2026-05-20" },
]

export default function MemoryPage() {
  const [memories, setMemories] = useState(initialMemories)
  const [search, setSearch] = useState("")

  const handleDelete = (id: string) => {
    setMemories(memories.filter(m => m.id !== id))
  }

  const filteredMemories = memories.filter(m => 
    m.text.toLowerCase().includes(search.toLowerCase()) || 
    m.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AuthGuard allowedRoles={["admin", "premium", "user"]}>
      <div className="space-y-8 pb-16 font-sans">
        
        {/* Header Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-8 md:p-10 shadow-sm"
        >
          <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
          <div className="absolute -right-16 -top-16 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono tracking-wider uppercase text-primary font-bold">
                <Database className="w-3.5 h-3.5" />
                Persistent Layer
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight text-foreground">
                Workspace <span className="font-serif italic font-semibold text-foreground">Memory</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl font-light leading-relaxed">
                Review, query, and optimize high-density semantic vector coordinates stored in standard Postgres tables and ChromaDB indexes.
              </p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <div className="p-4 bg-muted/40 border border-border rounded-xl flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase font-mono">Available Space</div>
                  <div className="text-sm font-bold text-foreground">98.4 / 100 MB</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Query Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input 
              type="text" 
              placeholder="Search memories or tags..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border/80 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>
          
          <div className="flex gap-3.5 w-full md:w-auto">
            <button className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 border border-border hover:bg-muted/60 text-xs font-bold uppercase tracking-wider rounded-xl transition-all">
              <Filter className="w-4 h-4 text-muted-foreground" />
              Filter Type
            </button>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-primary/95 transition-all shadow-sm">
              <RefreshCw className="w-4 h-4" />
              Re-Index Vectors
            </button>
          </div>
        </div>

        {/* Database List */}
        <div className="grid grid-cols-1 gap-4">
          {filteredMemories.length > 0 ? (
            filteredMemories.map((mem, idx) => (
              <motion.div
                key={mem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="glass-panel border border-border hover:border-primary/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-xl border border-border/80 text-foreground/80 shrink-0">
                    {mem.type === "vector" ? <Cpu className="w-5 h-5 text-primary" /> : <Layers className="w-5 h-5" />}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{mem.text}</p>
                    <div className="flex flex-wrap gap-2 items-center text-[10px] font-mono text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded border border-border">{mem.type}</span>
                      <span>•</span>
                      <span>Size: {mem.size}</span>
                      <span>•</span>
                      <span>Linked: {mem.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                  <button 
                    onClick={() => handleDelete(mem.id)}
                    className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/20 transition-all"
                    aria-label="Purge Memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-16 border border-dashed border-border rounded-3xl text-center flex flex-col items-center justify-center space-y-4">
              <Database className="w-12 h-12 text-muted-foreground/30" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No records matched</h3>
                <p className="text-xs text-muted-foreground">Try refining search parameters or sync logs again.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </AuthGuard>
  )
}
