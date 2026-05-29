"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Type, 
  FileUp, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit, 
  History, 
  Send, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  FileText,
  User,
  Activity,
  Heart,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '@/lib/api';

// ============================================================================ //
//  1. TYPES & SCHEMAS                                                        //
// ============================================================================ //

interface CaptureEntry {
  id: string;
  title: string;
  source: 'text' | 'voice' | 'document';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

interface AIInsight {
  summary: string;
  key_points: string[];
  action_items: string[];
  entities: {
    people?: string[];
    orgs?: string[];
    projects?: string[];
  };
  sentiment: string;
}

interface DetailedEntry {
  id: string;
  title: string;
  source: 'text' | 'voice' | 'document';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  raw_content: string;
  log: string;
  created_at: string;
  insight: AIInsight | null;
}

// ============================================================================ //
//  2. DESIGN SYSTEM CONSTANTS                                                 //
// ============================================================================ //

const CONFIG = {
  BRAND: {
    primary: '#E8D5B7',      // Warm amber-cream
    ink: '#1C1917',         // Rich near-black
    surface: '#FAF8F5',     // Warm white
    muted: '#78716C',       // Muted warm gray
    ember: '#C2410C',       // Terracotta accent
    sage: '#4D7C5F',        // Grounded forest green
    gold: '#B45309',        // Deep amber intelligence
  },
  FONTS: {
    display: '"Playfair Display", Georgia, serif',
    body: 'Outfit, sans-serif',
  }
};

// ============================================================================ //
//  3. AUXILIARY PREMIUM GLASS COMPONENTS                                      //
// ============================================================================ //

const GlassPanel = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
    className={`backdrop-blur-2xl bg-[#1E1B18]/70 border border-white/[0.07] rounded-[24px] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8)] overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const AmbientGlow = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute top-[5%] left-[10%] w-[35%] h-[35%] bg-[#B45309]/10 blur-[140px] rounded-full" />
    <div className="absolute bottom-[10%] right-[10%] w-[45%] h-[45%] bg-[#C2410C]/10 blur-[160px] rounded-full" />
  </div>
);

// ============================================================================ //
//  4. STANDALONE KCS DASHBOARD PAGE                                           //
// ============================================================================ //

export default function KnowledgeCaptureDashboard() {
  // Capture Modes
  const [activeMode, setActiveMode] = useState<'text' | 'voice' | 'file'>('text');
  
  // Capture Ingestion States
  const [textContent, setTextContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Status Tracking
  const [recentCaptures, setRecentCaptures] = useState<CaptureEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DetailedEntry | null>(null);
  const [activePollingId, setActivePollingId] = useState<string | null>(null);
  
  // Sound Visualization mock
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(24).fill(15));
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  // ── A. Ingestion Handlers ──────────────────────────────────────────

  // Fetch recent captures
  const fetchRecent = async () => {
    try {
      const response = await apiClient('/api/v1/knowledge/list/all?limit=8') as Response;
      if (response.ok) {
        const data = await response.json();
        setRecentCaptures(data);
      }
    } catch (err) {
      console.error('Failed to load captures:', err);
    }
  };

  useEffect(() => {
    fetchRecent();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
    };
  }, []);

  // Poll status for active captures
  const pollStatus = async (id: string) => {
    setActivePollingId(id);
    const interval = setInterval(async () => {
      try {
        const response = await apiClient(`/api/v1/knowledge/${id}`) as Response;
        if (response.ok) {
          const data = await response.json() as DetailedEntry;
          setSelectedEntry(data);
          
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(interval);
            setActivePollingId(null);
            setIsProcessing(false);
            fetchRecent();
          }
        } else {
          clearInterval(interval);
          setActivePollingId(null);
          setIsProcessing(false);
        }
      } catch (error) {
        clearInterval(interval);
        setActivePollingId(null);
        setIsProcessing(false);
      }
    }, 2500);
  };

  // Submit Text note
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('text', textContent);
      formData.append('title', noteTitle.trim() || `Text Capture: ${new Date().toLocaleTimeString()}`);

      const response = await apiClient('/api/v1/knowledge/text', {
        method: 'POST',
        body: formData,
      }) as Response;

      if (response.ok) {
        const data = await response.json();
        setTextContent('');
        setNoteTitle('');
        pollStatus(data.entry_id);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Failed to ingest text:', error);
      setIsProcessing(false);
    }
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await uploadVoice(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

      // Amplitude Waveform Visualizer simulation
      audioLevelInterval.current = setInterval(() => {
        setAudioLevels(prev => prev.map(() => Math.floor(Math.random() * 45) + 10));
      }, 100);

    } catch (error) {
      console.error('Microphone acquisition error:', error);
      alert('Could not acquire microphone interface. Ensure device permissions are enabled.');
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
  };

  const uploadVoice = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.wav');

      const response = await apiClient('/api/v1/knowledge/voice', {
        method: 'POST',
        body: formData,
      }) as Response;

      if (response.ok) {
        const data = await response.json();
        pollStatus(data.entry_id);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Failed to upload audio payload:', error);
      setIsProcessing(false);
    }
  };

  // File Upload Ingestion
  const handleFileSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient('/api/v1/knowledge/file', {
        method: 'POST',
        body: formData,
      }) as Response;

      if (response.ok) {
        const data = await response.json();
        setSelectedFile(null);
        pollStatus(data.entry_id);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('File ingestion failed:', error);
      setIsProcessing(false);
    }
  };

  // Select timeline items
  const selectEntry = async (id: string) => {
    try {
      const response = await apiClient(`/api/v1/knowledge/${id}`) as Response;
      if (response.ok) {
        const data = await response.json();
        setSelectedEntry(data);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    }
  };

  // Formatted duration
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-[#141210] text-[#F5F0E8] p-4 md:p-8 font-sans selection:bg-[#B45309]/30 relative overflow-x-hidden">
      
      {/* 🔮 Ambient Backdrops */}
      <AmbientGlow />
      
      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* ── HEADER SECTION ────────────────────────────────────────────────── */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.05] pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <BrainCircuit className="text-[#E8D5B7] w-10 h-10 stroke-[1.25]" />
              <h1 className="text-4xl font-extrabold tracking-tight text-white select-none" style={{ fontFamily: CONFIG.FONTS.display }}>
                Knowledge Capture
              </h1>
            </div>
            <p className="text-[#A09880] text-sm font-medium tracking-wide">
              Cognitive OS — Multi-modal sensory memory capture pipeline
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4D7C5F] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4D7C5F]"></span>
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#A09880]">KCS Engine Connected</span>
          </div>
        </header>

        {/* ── MAIN WORKSPACE GRID ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── LEFT SIDEBAR (7 Columns): CAPTURE PANELS ───────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Capture Mode Tabs */}
            <GlassPanel className="p-4" delay={0.05}>
              <div className="flex gap-2">
                {[
                  { id: 'text', label: 'Quick Note', icon: Type },
                  { id: 'voice', label: 'Voice Memo', icon: Mic },
                  { id: 'file', label: 'Upload notes', icon: FileUp },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveMode(item.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all ${
                        activeMode === item.id 
                          ? 'bg-[#E8D5B7] text-[#1C1917] font-bold shadow-[0_4px_16px_rgba(232,213,183,0.15)]' 
                          : 'text-[#A09880] hover:text-[#F5F0E8] hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[1.5]" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </GlassPanel>

            {/* Mode Content Panes */}
            <GlassPanel className="p-6" delay={0.1}>
              <AnimatePresence mode="wait">
                
                {/* 1. Text Ingestion Pane */}
                {activeMode === 'text' && (
                  <motion.form 
                    key="text-pane"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    onSubmit={handleTextSubmit}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold tracking-widest text-[#5C5448]">Optional Title</label>
                      <input 
                        type="text" 
                        placeholder="Define a context title (e.g. Sprint Goals)..." 
                        value={noteTitle}
                        onChange={e => setNoteTitle(e.target.value)}
                        className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 transition-all text-[#F5F0E8]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold tracking-widest text-[#5C5448]">Thought Details</label>
                      <textarea 
                        placeholder="Type out your thought, meeting insight, or key decisions..."
                        value={textContent}
                        onChange={e => setTextContent(e.target.value)}
                        className="w-full h-48 bg-black/30 border border-white/[0.07] rounded-xl p-4 text-sm focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 transition-all text-[#F5F0E8] resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!textContent.trim() || isProcessing}
                      className="w-full h-14 bg-[#E8D5B7] text-[#1C1917] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#FAF8F5] transition-all disabled:opacity-50 text-base"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Indexing...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 stroke-[2.0]" />
                          Record to Memory
                        </>
                      )}
                    </button>
                  </motion.form>
                )}

                {/* 2. Voice Recorder Ingestion Pane */}
                {activeMode === 'voice' && (
                  <motion.div 
                    key="voice-pane"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-col items-center py-6 space-y-8"
                  >
                    <div className="relative">
                      {isRecording && (
                        <motion.div 
                          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-[#C2410C] rounded-full blur-2xl pointer-events-none"
                        />
                      )}
                      <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 z-10 relative ${
                          isRecording ? 'bg-[#C2410C] hover:bg-[#C2410C]/90 text-white' : 'bg-[#E8D5B7] hover:bg-[#FAF8F5] text-[#1C1917]'
                        }`}
                      >
                        {isRecording ? <Square className="w-12 h-12 fill-white stroke-none" /> : <Mic className="w-12 h-12 stroke-[1.25]" />}
                      </button>
                    </div>

                    <div className="text-center space-y-2">
                      <span className="text-3xl font-mono font-bold tracking-tight text-white select-none">
                        {formatTime(recordingSeconds)}
                      </span>
                      <p className="text-xs uppercase font-bold tracking-widest text-[#5C5448]">
                        {isRecording ? 'Capturing Voice Pipeline...' : 'Click to acquire mic capture'}
                      </p>
                    </div>

                    {/* Waveform Visualizer Simulation */}
                    <div className="h-16 flex items-center justify-center gap-1 w-full max-w-sm px-6 bg-black/20 rounded-2xl border border-white/[0.03]">
                      {audioLevels.map((val, idx) => (
                        <motion.div 
                          key={idx}
                          animate={{ height: isRecording ? `${val}%` : '8px' }}
                          className={`w-1 bg-[#E8D5B7]/60 rounded-full ${isRecording ? 'bg-gradient-to-t from-[#C2410C] to-[#E8D5B7]' : ''}`}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 3. Document / File Drag & Drop Ingestion Pane */}
                {activeMode === 'file' && (
                  <motion.div 
                    key="file-pane"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4"
                  >
                    <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-[#E8D5B7]/40 transition-colors cursor-pointer relative group bg-black/10">
                      <input 
                        type="file" 
                        onChange={handleFileSubmit}
                        accept=".pdf,.docx,.txt,.md"
                        disabled={isProcessing}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <FileUp className="w-14 h-14 text-[#5C5448] mx-auto mb-4 group-hover:text-[#E8D5B7] transition-colors stroke-[1.25]" />
                      <h4 className="text-sm font-semibold text-[#F5F0E8] mb-1">Upload meeting notes or briefs</h4>
                      <p className="text-xs text-[#A09880] mb-4">PDF, DOCX, TXT, or MD files</p>
                      
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] border border-white/[0.05] rounded-full text-[10px] text-[#A09880] font-mono">
                        Max file limit: 10MB
                      </div>
                    </div>

                    {selectedFile && (
                      <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                        <div className="flex items-center gap-3">
                          <FileText className="text-[#E8D5B7] w-5 h-5" />
                          <div>
                            <p className="text-xs font-bold text-white max-w-[200px] truncate">{selectedFile.name}</p>
                            <p className="text-[10px] text-[#A09880] font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Loader2 className="w-4 h-4 animate-spin text-[#E8D5B7]" />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassPanel>

            {/* Real-time Transcription Stream Area */}
            <AnimatePresence>
              {selectedEntry && (
                <GlassPanel className="p-6 space-y-4" delay={0.15}>
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#5C5448] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      Original Raw Content / Transcript
                    </h3>
                    <span className="text-[10px] text-[#A09880] font-mono bg-white/[0.04] px-2 py-0.5 rounded italic">
                      Type: {selectedEntry.source.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto bg-black/20 p-4 rounded-xl border border-white/[0.03] text-sm text-[#A09880] leading-relaxed italic select-all">
                    &ldquo;{selectedEntry.raw_content || 'No content ingested yet.'}&rdquo;
                  </div>
                </GlassPanel>
              )}
            </AnimatePresence>

          </div>

          {/* ── RIGHT COLUMN (5 Columns): INTELLIGENCE & TIMELINE ───────────── */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Active Polling Status Card */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <GlassPanel className="p-5 border-[#B45309]/30 bg-gradient-to-r from-[#B45309]/5 to-transparent">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-[#E8D5B7]" />
                      <div>
                        <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#E8D5B7]">KCS Ingestion Running</h4>
                        <p className="text-[11px] text-[#A09880] mt-0.5">
                          {selectedEntry?.log || 'Extracting parameters and indexing vectors...'}
                        </p>
                      </div>
                    </div>
                  </GlassPanel>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Summary Preview Card */}
            <GlassPanel className="p-6 space-y-6" delay={0.2}>
              <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <Sparkles className="w-4 h-4 text-[#E8D5B7]" />
                  AI Summary & Insights
                </h3>
                
                {selectedEntry?.insight?.sentiment && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5]/10 text-[#E8D5B7] border border-white/[0.05]">
                    {selectedEntry.insight.sentiment}
                  </span>
                )}
              </div>

              {selectedEntry?.insight ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#5C5448]">Summary</h4>
                    <p className="text-sm text-[#F5F0E8] leading-relaxed bg-[#FAF8F5]/[0.02] border border-white/[0.03] p-4 rounded-xl">
                      {selectedEntry.insight.summary}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#5C5448]">Key Points</h4>
                      <ul className="text-xs space-y-2">
                        {selectedEntry.insight.key_points.map((pt, idx) => (
                          <li key={idx} className="flex gap-2.5 text-[#A09880] items-start">
                            <span className="text-[#E8D5B7] font-extrabold mt-0.5">•</span>
                            <span className="leading-normal">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#5C5448]">Action Deliverables</h4>
                      <ul className="text-xs space-y-2">
                        {selectedEntry.insight.action_items.map((act, idx) => (
                          <li key={idx} className="flex gap-2 text-[#4D7C5F] items-start font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="leading-normal">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/[0.05] rounded-2xl bg-black/10">
                  <BrainCircuit className="w-12 h-12 text-[#5C5448] mb-4 stroke-[1.25]" />
                  <p className="text-xs text-[#A09880] leading-relaxed max-w-[200px]">
                    Select a capture from history or submit a new ingestion to synthesize action items
                  </p>
                </div>
              )}
            </GlassPanel>

            {/* Activity History Timeline Panel */}
            <GlassPanel className="p-6 space-y-5" delay={0.25}>
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#5C5448] flex items-center gap-2 border-b border-white/[0.05] pb-3">
                <History className="w-4 h-4" />
                Capture Log history
              </h3>

              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {recentCaptures.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectEntry(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
                      selectedEntry?.id === item.id
                        ? 'bg-white/[0.04] border-[#E8D5B7]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'bg-[#FAF8F5]/[0.01] border-transparent hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        item.status === 'completed' ? 'bg-[#4D7C5F]/10 text-[#4D7C5F]' : 'bg-[#B45309]/10 text-[#B45309]'
                      }`}>
                        <FileText className="w-4 h-4 stroke-[1.5]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white max-w-[150px] truncate group-hover:text-[#E8D5B7] transition-colors">{item.title}</h4>
                        <p className="text-[10px] text-[#A09880] mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        item.status === 'completed' ? 'bg-[#4D7C5F]/10 text-[#4D7C5F]' : 'bg-[#B45309]/10 text-[#B45309] animate-pulse'
                      }`}>
                        {item.status}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#5C5448] group-hover:text-white transition-colors" />
                    </div>
                  </button>
                ))}

                {recentCaptures.length === 0 && (
                  <div className="text-center py-6 text-xs text-[#5C5448] italic">
                    No recent ingestion logs found.
                  </div>
                )}
              </div>
            </GlassPanel>

          </div>
          
        </div>
        
      </div>
    </div>
  );
}
