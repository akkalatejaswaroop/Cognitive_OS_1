"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Clock, 
  Zap, 
  Star, 
  Trash2, 
  BrainCircuit,
  Calendar,
  Layers,
  Loader2,
  RefreshCcw
} from 'lucide-react';
import { MemoryTimeline, Memory as TimelineMemory } from '@/components/MemoryTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';

// --- Types ---

interface Memory {
  id: string;
  content: string;
  metadata: {
    type: 'episodic' | 'semantic' | 'procedural';
    importance: number;
    timestamp: string;
    tags: string[];
    userId: string;
  };
  similarity?: number;
}

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] ${className}`}>
    {children}
  </div>
);

const MemoryCard = ({ memory, onDelete }: { memory: Memory; onDelete: (id: string) => void }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'semantic': return 'text-blue-400 bg-blue-400/10';
      case 'episodic': return 'text-purple-400 bg-purple-400/10';
      case 'procedural': return 'text-emerald-400 bg-emerald-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <GlassCard className="p-5 h-full flex flex-col justify-between group">
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTypeColor(memory.metadata.type)}`}>
              {memory.metadata.type}
            </span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                <Star size={14} className={memory.metadata.importance > 0.8 ? "fill-yellow-500 text-yellow-500" : ""} />
              </button>
              <button 
                onClick={() => onDelete(memory.id)}
                className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <p className="text-gray-200 leading-relaxed mb-4 line-clamp-3 italic">
            &ldquo;{memory.content}&rdquo;
          </p>
        </div>
        
        <div className="pt-4 border-t border-white/5">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(memory.metadata.tags || []).map(tag => (
              <span key={tag} className="text-[10px] text-gray-500 bg-black/20 px-2 py-0.5 rounded italic">
                #{tag}
              </span>
            ))}
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-500">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(memory.metadata.timestamp).toLocaleDateString()}
            </div>
            {memory.similarity !== undefined && (
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-cyan-400" />
                {Math.round(memory.similarity * 100)}% Match
              </div>
            )}
            {memory.similarity === undefined && (
              <div className="flex items-center gap-1">
                <Zap size={12} className="text-gray-600" />
                {Math.round(memory.metadata.importance * 100)}% Imp
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default function MemoryDashboard() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const fetchMemories = useCallback(async (query: string = '') => {
    if (!user) return;
    
    setIsSearching(!!query);
    try {
      const response = await apiClient('/api/v1/memory/query', {
        method: 'POST',
        body: JSON.stringify({
          query: query || '',
          n_results: 20
        })
      }) as Response;

      if (response.ok) {
        const result = await response.json();
        setMemories(result.results || []);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
      fetchMemories();
    }
  }, [user, fetchMemories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(searchQuery);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      const response = await apiClient(`/api/v1/memory/${id}`, {
        method: 'DELETE'
      }) as Response;
      if (response.ok) {
        setMemories(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const filteredMemories = useMemo(() => {
    let result = [...memories];
    if (activeFilter === 'recent') {
      result.sort((a, b) => new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime());
    } else if (activeFilter === 'important') {
      result = result.filter(m => m.metadata.importance > 0.8);
    }
    return result;
  }, [memories, activeFilter]);

  const timelineData: TimelineMemory[] = useMemo(() => {
    return memories.map(m => ({
      id: m.id,
      content: m.content,
      type: m.metadata.type,
      importance: m.metadata.importance,
      timestamp: m.metadata.timestamp,
      tags: m.metadata.tags,
      summary: ((m.metadata as Record<string, unknown>).summary as string) || "" // AI summary if exists
    }));
  }, [memories]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* --- Header --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              Memory Engine
            </h1>
            <p className="text-gray-400 text-sm">Managing your cognitive digital extensions</p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <div className="relative group">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-cyan-400 animate-pulse' : 'text-gray-500 group-focus-within:text-cyan-400'}`} size={18} />
              <input 
                type="text" 
                placeholder="Semantic search across memories..." 
                className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 w-full md:w-[350px] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="animate-spin text-cyan-400" size={16} />
                </div>
              )}
            </div>
            <button 
              type="button"
              onClick={() => fetchMemories()}
              className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors text-gray-400"
            >
              <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </form>
        </header>

        {/* --- Grid Layout --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- Left Column: Insights --- */}
          <aside className="lg:col-span-3 space-y-6">
            <GlassCard className="p-6 border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
              <div className="flex items-center gap-3 mb-6">
                <BrainCircuit className="text-cyan-400" size={24} />
                <h3 className="font-semibold text-sm">Cognitive Health</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] mb-2 text-gray-400">
                    <span>Index density</span>
                    <span className="text-cyan-400">84%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '84%' }}
                      className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-2 text-gray-400">
                    <span>Recall accuracy</span>
                    <span className="text-purple-400">92%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '92%' }}
                      className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]" 
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5">
                <p className="text-[12px] text-gray-400 leading-relaxed italic">
                  &ldquo;Your semantic focus has shifted towards <span className="text-white">Architecture</span> and <span className="text-white">Logic</span> in the last 48 hours.&rdquo;
                </p>
              </div>
            </GlassCard>

            <nav className="space-y-2">
              {[
                { label: 'All Memories', icon: Layers, id: 'all' },
                { label: 'Recently Added', icon: Clock, id: 'recent' },
                { label: 'Critical Data', icon: Star, id: 'important' },
                { label: 'Timeline View', icon: Calendar, id: 'timeline' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveFilter(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeFilter === item.id 
                    ? 'bg-white/10 text-white border border-white/10' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* --- Main Content: Memory Feed --- */}
          <main className="lg:col-span-9">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <GlassCard key={i} className="h-[250px] p-5 flex flex-col justify-between animate-pulse">
                    <div className="space-y-3">
                      <div className="w-20 h-4 bg-white/10 rounded-full" />
                      <div className="w-full h-20 bg-white/5 rounded-lg" />
                    </div>
                    <div className="w-full h-10 bg-white/5 rounded-lg" />
                  </GlassCard>
                ))}
              </div>
            ) : activeFilter === 'timeline' ? (
              <MemoryTimeline memories={timelineData} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode='popLayout'>
                  {filteredMemories.map((memory: Memory) => (
                    <MemoryCard key={memory.id} memory={memory} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
                
                {/* --- Add New Placeholder --- */}
                <button className="h-[250px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-gray-600 hover:text-gray-400 hover:border-white/20 transition-all group">
                  <div className="p-4 rounded-full bg-white/5 group-hover:scale-110 transition-transform">
                    <Zap size={24} />
                  </div>
                  <span className="text-xs font-semibold tracking-widest uppercase">Augment Memory</span>
                </button>
              </div>
            )}

            {/* --- Empty State Placeholder --- */}
            {!isLoading && memories.length === 0 && (
              <div className="h-[400px] flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <BrainCircuit size={40} className="text-gray-700" />
                </div>
                <h3 className="text-xl font-medium mb-2">Neural Void Detected</h3>
                <p className="text-gray-500 max-w-xs text-sm">No memories found in this sector. Start interacting with the AI to populate your cognitive engine.</p>
              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}
