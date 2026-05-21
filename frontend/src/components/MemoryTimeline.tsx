"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Star, 
  Clock, 
  BrainCircuit,
  Zap
} from 'lucide-react';

/**
 * --- Types ---
 */

export interface Memory {
  id: string;
  content: string;
  type: 'episodic' | 'semantic' | 'procedural';
  importance: number;
  timestamp: string;
  tags: string[];
  summary?: string; // AI generated summary
}

interface MemoryTimelineProps {
  memories: Memory[];
  onSearch?: (query: string) => void;
}

/**
 * --- Helper: Date Grouping ---
 */
const groupMemoriesByDate = (memories: Memory[]) => {
  const groups: Record<string, Memory[]> = {};
  
  memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  memories.forEach(memory => {
    const date = new Date(memory.timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(memory);
  });

  return groups;
};

/**
 * --- Components ---
 */

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-xl ${className}`}>
    {children}
  </div>
);

const TimelineItem = ({ memory, isLast }: { memory: Memory, isLast: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'semantic': return 'text-blue-400 border-blue-400/30 bg-blue-400/5';
      case 'episodic': return 'text-purple-400 border-purple-400/30 bg-purple-400/5';
      case 'procedural': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/5';
    }
  };

  return (
    <div className="relative pl-8 pb-12 last:pb-0">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-cyan-500/50 via-white/5 to-transparent" />
      )}
      
      {/* Timeline Dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-[#050505] border-2 border-cyan-500 flex items-center justify-center z-10 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
        <div className="w-2 h-2 rounded-full bg-cyan-400" />
      </div>

      {/* Content */}
      <motion.div 
        layout
        className="group"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <GlassCard className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-cyan-500/30' : 'hover:bg-white/10'}`}>
          <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(memory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${getTypeStyles(memory.type)}`}>
                    {memory.type}
                  </span>
                  {memory.importance > 0.8 && (
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <p className={`text-gray-200 text-sm leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                  {memory.content}
                </p>
              </div>
              <button className="text-gray-500 hover:text-white transition-colors mt-1">
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 mt-4 border-t border-white/5 space-y-4">
                    {memory.summary && (
                      <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 text-cyan-400 text-[10px] font-bold uppercase tracking-wider">
                          <BrainCircuit size={12} />
                          AI Summary
                        </div>
                        <p className="text-gray-300 text-xs italic leading-relaxed">
                          {memory.summary}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {memory.tags.map(tag => (
                        <span key={tag} className="text-[10px] text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <Zap size={12} className="text-cyan-400" />
                        Relevance: {Math.round(memory.importance * 100)}%
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        Stored: {new Date(memory.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({ memories, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredMemories = useMemo(() => {
    if (!searchTerm) return memories;
    return memories.filter(m => 
      m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [memories, searchTerm]);

  const groupedMemories = useMemo(() => groupMemoriesByDate(filteredMemories), [filteredMemories]);

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto p-4">
      {/* Search Header */}
      <div className="relative group mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Filter timeline by keywords or tags..." 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder:text-gray-600"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onSearch?.(e.target.value);
          }}
        />
      </div>

      {/* Timeline Sections */}
      <div className="space-y-12">
        {Object.entries(groupedMemories).map(([date, dateMemories]) => (
          <div key={date} className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Calendar size={18} />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-100">{date}</h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div className="space-y-0">
              {dateMemories.map((memory, idx) => (
                <TimelineItem 
                  key={memory.id} 
                  memory={memory} 
                  isLast={idx === dateMemories.length - 1} 
                />
              ))}
            </div>
          </div>
        ))}

        {filteredMemories.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex p-4 rounded-full bg-white/5 mb-4">
              <Clock size={32} className="text-gray-600" />
            </div>
            <h3 className="text-gray-300 font-medium">No chronological matches</h3>
            <p className="text-gray-500 text-sm mt-1">Try searching for broader terms or clearing filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
