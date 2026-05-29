"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Activity,
  Target,
  Cpu,
  Sparkles,
  Clock,
  PlusCircle,
  Play,
  Square,
  BrainCircuit,
  TrendingUp,
  Layers,
  Clock3,
  ChevronRight,
  ArrowRight,
  Send,
  Loader2,
  Trash2,
  ListTodo
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import {
  ProductivityTrendGraph,
  WeeklyFocusHeatmap,
  GoalCompletionAnalytics,
  CognitiveLoadChart,
  TaskCompletionGraph,
  RecommendationImpactGraph
} from './components/AnalyticsGraphs';


// ============================================================================ #
//  1. CONFIGURATION & DESIGN SYSTEM CONSTANTS                                 #
// ============================================================================ #

const CONFIG = {
  BRAND: {
    primary: '#E8D5B7',      // Warm amber-cream
    ink: '#1C1917',         // Rich near-black
    surface: '#141210',     // Warm dark
    card: '#252219',        // Warm amber cards
    ember: '#C2410C',       // Terracotta highlight
    sage: '#4D7C5F',        // Grounded forest green
    gold: '#B45309',        // Deep intelligence amber
    muted: '#78716C',       // Muted warm gray
  },
  FONTS: {
    display: '"Playfair Display", Georgia, serif',
    body: 'Outfit, sans-serif',
  }
};

// Ambient Light Backdrop
const AmbientGlow = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute top-[5%] right-[5%] w-[40%] h-[40%] bg-[#B45309]/5 blur-[160px] rounded-full" />
    <div className="absolute bottom-[10%] left-[5%] w-[45%] h-[45%] bg-[#C2410C]/5 blur-[180px] rounded-full" />
  </div>
);

// Translucent Card Panel
const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
    className={`backdrop-blur-2xl bg-[#1E1B18]/70 border border-white/[0.07] rounded-[24px] shadow-[0_16px_48px_-16px_rgba(0,0,0,0.8)] overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

// ============================================================================ #
//  2. CORE TYPES                                                              #
// ============================================================================ #

interface Goal {
  id: string;
  title: string;
  description?: string;
  completion_percentage: number;
  status: 'active' | 'completed' | 'delayed' | 'abandoned';
  target_date: string;
  goal_type?: 'short_term' | 'long_term';
  parent_goal_id?: string | null;
  projected_completion_date?: string | null;
  key_results?: {
    milestones?: Array<{ step: string; done: boolean }>;
  } | null;
}

interface Recommendation {
  id: string;
  title: string;
  category: string;
  description: string;
  priority_score: number;
  is_actionable: boolean;
  action_payload?: Record<string, any>;
}

interface FocusTrendItem {
  date: string;
  focus_minutes: number;
  flow_score: number;
}

interface DashboardData {
  overview: {
    total_focus_hours: number;
    average_flow_score: number;
    cognitive_load_average: number;
    goals_completed: number;
  };
  focus_trend: FocusTrendItem[];
  cognitive_fatigue: {
    fatigue_index: number;
    context_switches_per_hour: number;
    distraction_ratio: number;
    high_stress_pockets: string[];
  };
  goals: Goal[];
  recommendations: Recommendation[];
}

// ============================================================================ #
//  3. MAIN PAGE COMPONENT                                                     #
// ============================================================================ #

export default function AnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframeDays, setTimeframeDays] = useState(7);

  const [aiReport, setAiReport] = useState<{
    id?: string;
    markdown_content: string;
    metrics_summary?: Record<string, any>;
  } | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Interactive Goal Creation Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalDate, setNewGoalDate] = useState('');
  const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
  const [newGoalType, setNewGoalType] = useState<'short_term' | 'long_term'>('short_term');
  const [newGoalParentId, setNewGoalParentId] = useState<string>('');

  // Extended Goal Tabs & AI milestones state
  const [goalTab, setGoalTab] = useState<'all' | 'long_term' | 'short_term'>('all');
  const [selectedGoalForMilestones, setSelectedGoalForMilestones] = useState<Goal | null>(null);
  const [suggestedMilestones, setSuggestedMilestones] = useState<Array<{ step: string; done: boolean }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);

  // Interactive Live Telemetry Simulator State
  const [isSimulatingTelemetry, setIsSimulatingTelemetry] = useState(false);
  const [simulatedLoadRecord, setSimulatedLoadRecord] = useState<{
    fatigue_index: number;
    application: string;
    switches: number;
    keys: number;
  } | null>(null);
  const telemetryTimer = useRef<NodeJS.Timeout | null>(null);

  // Focus Pomodoro Active Session State
  const [activeSession, setActiveSession] = useState<{
    id: string;
    startedAt: Date;
    goalId?: string;
  } | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [selectedGoalForFocus, setSelectedGoalForFocus] = useState<string>('');
  const [sessionRunning, setSessionRunning] = useState(false);
  const focusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [focusInterruptions, setFocusInterruptions] = useState(0);

  // Automation Logs console panel
  const [automationLogs, setAutomationLogs] = useState<string[]>([
    "System: Core analytics engine initialized.",
    "System: Multi-agent telemetry listener running."
  ]);

  // Load Dashboard Snapshot data
  const loadDashboard = async () => {
    try {
      const response = await apiClient(`/api/v1/analytics/dashboard?days=${timeframeDays}`) as Response;
      if (response.ok) {
        const payload = await response.json();
        setData(payload);
      }
    } catch (err) {
      console.error("Dashboard api lookup failed. Falling back to hydrated mock indices.");
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentReport = async () => {
    try {
      const response = await apiClient('/api/v1/analytics/reports/recent') as Response;
      if (response.ok) {
        const payload = await response.json();
        setAiReport(payload);
      }
    } catch (err) {
      console.log("No recent report found, ready for generation.");
    }
  };

  const generateNewReport = async () => {
    setGeneratingReport(true);
    setAutomationLogs(prev => [...prev, "Agent: Triggering AI Insights Engine to run behavioral diagnostics..."]);
    try {
      const response = await apiClient(`/api/v1/analytics/reports/generate?days=${timeframeDays}`, {
        method: 'POST'
      }) as Response;
      if (response.ok) {
        const payload = await response.json();
        setAiReport(payload);
        setAutomationLogs(prev => [...prev, "Agent [Analytics]: Successfully generated complete productivity behavioral report."]);
        loadDashboard();
      }
    } catch (err) {
      setAutomationLogs(prev => [...prev, "Agent [Analytics]: Report generation failed. Using baseline cognitive heuristics."]);
    } finally {
      setGeneratingReport(false);
    }
  };

  const loadMockData = () => {
    setData({
      overview: {
        total_focus_hours: 24.5,
        average_flow_score: 0.84,
        cognitive_load_average: 0.36,
        goals_completed: 3
      },
      focus_trend: [
        { date: 'Mon', focus_minutes: 180, flow_score: 0.90 },
        { date: 'Tue', focus_minutes: 240, flow_score: 0.85 },
        { date: 'Wed', focus_minutes: 120, flow_score: 0.80 },
        { date: 'Thu', focus_minutes: 310, flow_score: 0.88 },
        { date: 'Fri', focus_minutes: 260, flow_score: 0.82 },
        { date: 'Sat', focus_minutes: 90, flow_score: 0.75 },
        { date: 'Sun', focus_minutes: 150, flow_score: 0.88 },
      ],
      cognitive_fatigue: {
        fatigue_index: 0.36,
        context_switches_per_hour: 9.4,
        distraction_ratio: 0.18,
        high_stress_pockets: ["14:30 - 16:00"]
      },
      goals: [
        { id: '1', title: 'Swarm Router Integration', completion_percentage: 80.0, status: 'active', target_date: new Date(Date.now() + 86400000 * 2).toISOString() },
        { id: '2', title: 'Complete Cofounder QA Report', completion_percentage: 100.0, status: 'completed', target_date: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', title: 'Build Telemetry Pipeline', completion_percentage: 35.0, status: 'active', target_date: new Date(Date.now() + 86400000 * 5).toISOString() }
      ],
      recommendations: [
        {
          id: 'rec_1',
          title: 'Delegate Deployment Scripting',
          category: 'delegation',
          description: 'Your scroll telemetry shows 45 minutes spent debugging standard shell actions. Click below to delegate script generation to the execution agent.',
          priority_score: 0.91,
          is_actionable: true,
          action_payload: { workflow: "generate_deployment_script" }
        },
        {
          id: 'rec_2',
          title: 'Pace focus Pomodoros',
          category: 'focus',
          description: 'Active keys variance indicates stress accumulation between 14:00 - 15:30. Take a structured 10-minute break to lower fatigue index.',
          priority_score: 0.78,
          is_actionable: false
        }
      ]
    });
  };

  useEffect(() => {
    loadDashboard();
    fetchRecentReport();
    return () => {
      if (telemetryTimer.current) clearInterval(telemetryTimer.current);
      if (focusTimerRef.current) clearInterval(focusTimerRef.current);
    };
  }, [timeframeDays]);

  // ── A. Live Telemetry Simulator ────────────────────────────────────
  const startTelemetrySimulation = () => {
    setIsSimulatingTelemetry(true);
    setAutomationLogs(prev => [...prev, "Telemetry: Ingesting active typing cadence..."]);

    let counter = 0;
    telemetryTimer.current = setInterval(async () => {
      counter++;
      const apps = ["VS Code", "Chrome (StackOverflow)", "Chrome (YouTube)", "Terminal", "Slack"];
      const application = apps[Math.floor(Math.random() * apps.length)];
      const isDistracting = application.includes("YouTube") || application.includes("Slack");
      const switches = Math.floor(Math.random() * 8) + 1;
      const keys = Math.floor(Math.random() * 120) + 20;

      try {
        const res = await apiClient('/api/v1/analytics/telemetry', {
          method: 'POST',
          body: JSON.stringify({
            active_application: application,
            window_title: `Editing code in active cycle #${counter}`,
            app_switch_count: switches,
            keystroke_count: keys,
            keystroke_average_gap_ms: isDistracting ? 800.0 : 190.5,
            mouse_scroll_pixels: Math.floor(Math.random() * 900),
            is_distracting: isDistracting
          })
        }) as Response;

        if (res.ok) {
          const body = await res.json();
          setSimulatedLoadRecord({
            fatigue_index: body.fatigue_index,
            application,
            switches,
            keys
          });
          setAutomationLogs(prev => [
            ...prev,
            `Telemetry: Switched to ${application}. Fatigue factor calculated: ${body.fatigue_index}`
          ]);
        }
      } catch (err) {
        // Mock fallback simulation calculations
        const calculatedFatigue = isDistracting ? 0.72 : 0.28;
        setSimulatedLoadRecord({
          fatigue_index: calculatedFatigue,
          application,
          switches,
          keys
        });
        setAutomationLogs(prev => [
          ...prev,
          `Telemetry: Switched to ${application} (Mock). Fatigue factor calculated: ${calculatedFatigue}`
        ]);
      }
    }, 4000);
  };

  const stopTelemetrySimulation = () => {
    setIsSimulatingTelemetry(false);
    if (telemetryTimer.current) clearInterval(telemetryTimer.current);
    setAutomationLogs(prev => [...prev, "Telemetry: Ingestion simulation terminated."]);
  };

  // ── B. Pomodoro Focus Timers ───────────────────────────────────────
  const startFocusTimer = async () => {
    setFocusInterruptions(0);
    try {
      const res = await apiClient('/api/v1/analytics/focus/start', {
        method: 'POST',
        body: JSON.stringify({ goal_id: selectedGoalForFocus || null })
      }) as Response;

      if (res.ok) {
        const body = await res.json();
        setActiveSession({
          id: body.session_id,
          startedAt: new Date(body.started_at),
          goalId: selectedGoalForFocus || undefined
        });
      }
    } catch (err) {
      // Mock Fallback
      setActiveSession({
        id: Math.random().toString(36).substring(2),
        startedAt: new Date(),
        goalId: selectedGoalForFocus || undefined
      });
    }

    setSessionSeconds(0);
    setSessionRunning(true);
    setIsFocusModalOpen(false);
    setAutomationLogs(prev => [...prev, "Focus: Commencing Pomodoro focus session."]);

    focusTimerRef.current = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
  };

  const endFocusTimer = async () => {
    if (!activeSession) return;
    setSessionRunning(false);
    if (focusTimerRef.current) clearInterval(focusTimerRef.current);

    const switches = Math.floor(Math.random() * 4) + 1;

    try {
      const res = await apiClient('/api/v1/analytics/focus/end', {
        method: 'POST',
        body: JSON.stringify({
          session_id: activeSession.id,
          interruption_count: focusInterruptions,
          context_switch_count: switches
        })
      }) as Response;

      if (res.ok) {
        const body = await res.json();
        setAutomationLogs(prev => [
          ...prev,
          `Focus: Session completed! Duration: ${Math.round(body.duration_seconds / 60)}m, Flow Rating: ${body.flow_state_score}`
        ]);
        loadDashboard();
      }
    } catch (err) {
      // Mock completion
      const score = Math.max(0.0, 1.0 - (focusInterruptions * 0.1) - (switches * 0.05));
      setAutomationLogs(prev => [
        ...prev,
        `Focus: Session completed (Mock)! Flow Rating: ${score}`
      ]);
      loadDashboard();
    }

    setActiveSession(null);
  };

  // ── C. Create Goal ──────────────────────────────────────────────────
  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !newGoalDate) return;

    setIsSubmittingGoal(true);
    try {
      const res = await apiClient('/api/v1/analytics/goals', {
        method: 'POST',
        body: JSON.stringify({
          title: newGoalTitle,
          description: newGoalDesc,
          target_date: new Date(newGoalDate).toISOString(),
          goal_type: newGoalType,
          parent_goal_id: newGoalParentId || null,
          key_results: { milestones: [] }
        })
      }) as Response;

      if (res.ok) {
        setNewGoalTitle('');
        setNewGoalDesc('');
        setNewGoalDate('');
        setNewGoalType('short_term');
        setNewGoalParentId('');
        setShowGoalModal(false);
        setAutomationLogs(prev => [...prev, `Goals: Successfully created ${newGoalType} target: '${newGoalTitle}'`]);
        loadDashboard();
      }
    } catch (err) {
      setAutomationLogs(prev => [...prev, `Goals: Simulated goal creation for: ${newGoalTitle}`]);
      setShowGoalModal(false);
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  // ── C1. AI Milestone Suggestions ───────────────────────────────────
  const loadMilestoneSuggestions = async (goal: Goal) => {
    setSelectedGoalForMilestones(goal);
    setShowMilestoneDialog(true);
    setLoadingSuggestions(true);
    setSuggestedMilestones([]);
    setAutomationLogs(prev => [...prev, `Agent: Consulting Planning specialist for goal '${goal.title}'...`]);

    try {
      const res = await apiClient(`/api/v1/analytics/goals/${goal.id}/milestones/suggest`, {
        method: 'POST'
      }) as Response;
      if (res.ok) {
        const data = await res.json();
        setSuggestedMilestones(data);
        setAutomationLogs(prev => [...prev, `Agent [Planning]: Generated ${data.length} milestone suggestions.`]);
      } else {
        throw new Error("Failed to load suggestions");
      }
    } catch (err) {
      // Fallback suggestions
      setSuggestedMilestones([
        { step: "Perform initial analysis & requirements gathering", done: false },
        { step: "Design architecture and system flow", done: false },
        { step: "Implement core modules and database logic", done: false },
        { step: "Run automated tests & verify deliverables", done: false }
      ]);
      setAutomationLogs(prev => [...prev, `Agent [Planning]: Using local fallback milestones for plan development.`]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAcceptMilestones = async () => {
    if (!selectedGoalForMilestones) return;
    setAutomationLogs(prev => [...prev, `Agent: Committing approved milestones for '${selectedGoalForMilestones.title}'...`]);

    try {
      const res = await apiClient(`/api/v1/analytics/goals/${selectedGoalForMilestones.id}/milestones/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestones: suggestedMilestones
        })
      }) as Response;

      if (res.ok) {
        setAutomationLogs(prev => [...prev, `Goals: Milestones successfully active and tracked.`]);
        setShowMilestoneDialog(false);
        loadDashboard();
      }
    } catch (err) {
      setAutomationLogs(prev => [...prev, `Goals: Failed to register milestones.`]);
      setShowMilestoneDialog(false);
    }
  };

  const handleToggleMilestone = async (goal: Goal, index: number) => {
    const miles = goal.key_results?.milestones || [];
    const updated = miles.map((m: { step: string; done: boolean }, idx: number) => idx === index ? { ...m, done: !m.done } : m);

    setAutomationLogs(prev => [...prev, `Goals: Toggling milestone index #${index} in '${goal.title}'...`]);
    try {
      const res = await apiClient(`/api/v1/analytics/goals/${goal.id}/milestones/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestones: updated
        })
      }) as Response;
      if (res.ok) {
        loadDashboard();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── D. Execute Recommendation ──────────────────────────────────────
  const triggerRecommendation = async (id: string, payload?: Record<string, any>) => {
    setAutomationLogs(prev => [...prev, `Agent: Fetching recommendation payload and requesting delegation approval...`]);
    try {
      const res = await apiClient(`/api/v1/analytics/recommendations/${id}/execute`, {
        method: 'POST'
      }) as Response;

      if (res.ok) {
        const body = await res.json();
        setAutomationLogs(prev => [
          ...prev,
          `Agent [Supervisor]: Successfully executed action for recommendation ${id}. Initiated swarm workflow: ${body.payload?.workflow || 'default'}`
        ]);
      }
    } catch (err) {
      setAutomationLogs(prev => [
        ...prev,
        `Agent [Supervisor]: Executed simulated workflow: ${payload?.workflow || 'default_delegation'}`
      ]);
    }
  };

  // Duration calculations
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60).toString().padStart(2, '0');
    const secs = (sec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };


  return (
    <AuthGuard allowedRoles={["admin", "premium"]}>
      <div className="min-h-screen bg-[#141210] text-[#F5F0E8] p-4 md:p-8 font-sans selection:bg-[#B45309]/30 relative overflow-x-hidden pb-24">

        <AmbientGlow />

        <div className="max-w-7xl mx-auto relative z-10 space-y-8">

          {/* ── HEADER ──────────────────────────────────────────────────────── */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.05] pb-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-[#E8D5B7] w-10 h-10 stroke-[1.25]" />
                <h1 className="text-4xl font-extrabold tracking-tight text-white select-none" style={{ fontFamily: CONFIG.FONTS.display }}>
                  Productivity Analytics
                </h1>
              </div>
              <p className="text-[#A09880] text-sm font-medium tracking-wide">
                Cognitive OS — Swarm telemetry diagnostics and cognitive loading metrics
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Telemetry Simulator Trigger */}
              <button
                onClick={isSimulatingTelemetry ? stopTelemetrySimulation : startTelemetrySimulation}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border transition-all ${isSimulatingTelemetry
                    ? 'bg-[#C2410C]/20 border-[#C2410C]/40 text-[#C2410C] animate-pulse'
                    : 'bg-white/[0.03] border-white/[0.07] text-[#A09880] hover:text-[#F5F0E8] hover:bg-white/[0.05]'
                  }`}
              >
                <Activity className="w-3.5 h-3.5 inline mr-1.5" />
                {isSimulatingTelemetry ? 'Telemetry Sim Running' : 'Start Live Telemetry'}
              </button>

              {/* Pomodoro Focus session trigger */}
              {activeSession ? (
                <button
                  onClick={endFocusTimer}
                  className="px-4 py-2 rounded-xl bg-[#C2410C] text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#C2410C]/90 shadow-lg"
                >
                  <Square className="w-3 h-3 fill-white" />
                  {formatTime(sessionSeconds)} Focus Session
                </button>
              ) : (
                <button
                  onClick={() => setIsFocusModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#E8D5B7] text-[#1C1917] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-[#FAF8F5] shadow-lg"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Focus Timer
                </button>
              )}

              {/* Timeframe Filter */}
              <div className="bg-black/20 border border-white/[0.05] p-1.5 rounded-xl flex gap-1 font-mono text-[10px] font-bold">
                {[7, 30].map(d => (
                  <button
                    key={d}
                    onClick={() => setTimeframeDays(d)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${timeframeDays === d ? 'bg-[#E8D5B7] text-[#1C1917]' : 'text-[#A09880] hover:text-white'
                      }`}
                  >
                    {d} DAYS
                  </button>
                ))}
              </div>
            </div>
          </header>

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#E8D5B7]" />
              <p className="text-xs text-[#A09880] font-mono">Aggregating telemetry diagnostics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* ── LEFT COLUMN (7 Columns): CHARTS & TELEMETRY ───────────────── */}
              <div className="lg:col-span-7 space-y-6">

                {/* Grid 1: Basic metrics deck */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: "Daily Focus Hours", value: `${data?.overview?.total_focus_hours || 0} hrs`, icon: Clock, desc: "Flow hours registered" },
                    { label: "Flow State Index", value: `${Math.round((data?.overview?.average_flow_score || 1.0) * 100)}%`, icon: Zap, desc: "Active focus stability" },
                    { label: "Fatigue Average", value: `${Math.round((data?.overview?.cognitive_load_average || 0.2) * 100)}%`, icon: BrainCircuit, desc: "Telemetry strain score" }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <GlassCard key={idx} className="p-5 flex flex-col justify-between gap-4 group hover:border-[#E8D5B7]/20 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">{item.label}</span>
                          <div className="p-2 bg-white/[0.03] border border-white/[0.05] rounded-lg">
                            <Icon className="w-4 h-4 text-[#E8D5B7] stroke-[1.5]" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-bold tracking-tight text-white">{item.value}</h3>
                          <p className="text-[10px] text-[#A09880] font-medium">{item.desc}</p>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>

                {/* AI Insights Engine Report Panel */}
                <GlassCard className="p-6 space-y-5 border-[#E8D5B7]/10 bg-gradient-to-br from-[#252219]/30 to-transparent">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#E8D5B7] flex items-center gap-1.5 animate-pulse">
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        AI Insights Engine
                      </span>
                      <h3 className="text-xl font-bold text-white mt-1" style={{ fontFamily: CONFIG.FONTS.display }}>
                        Behavioral Diagnostics
                      </h3>
                    </div>

                    <button
                      onClick={generateNewReport}
                      disabled={generatingReport}
                      className="px-4 py-2 bg-[#E8D5B7] hover:bg-[#FAF8F5] disabled:opacity-50 text-[#1C1917] font-bold rounded-xl text-[10px] uppercase font-mono tracking-wider flex items-center gap-1.5 transition-all shadow-md"
                    >
                      {generatingReport ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Run Diagnostics
                        </>
                      )}
                    </button>
                  </div>

                  {aiReport ? (
                    <div className="space-y-4 text-xs text-[#A09880] leading-relaxed max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {aiReport.markdown_content.split('\n').map((line, idx) => {
                        if (line.startsWith('# ')) {
                          return null; // Skip main title
                        }
                        if (line.startsWith('## ')) {
                          return (
                            <h4 key={idx} className="text-sm font-bold text-white pt-3 border-b border-white/[0.03] pb-1 first:pt-0" style={{ fontFamily: CONFIG.FONTS.display }}>
                              {line.substring(3)}
                            </h4>
                          );
                        }
                        if (line.startsWith('- ')) {
                          return (
                            <div key={idx} className="flex gap-2 items-start pl-2">
                              <span className="text-[#E8D5B7] mt-1.5 select-none">•</span>
                              <span>{line.substring(2)}</span>
                            </div>
                          );
                        }
                        if (line.trim() === '') return null;
                        return <p key={idx} className="pl-1">{line}</p>;
                      })}
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-white/[0.07] rounded-2xl bg-black/10">
                      <BrainCircuit className="w-8 h-8 text-[#5C5448]" />
                      <p className="text-xs text-[#A09880] font-mono max-w-xs">
                        No active behavioral report generated for this cycle. Run diagnostics to trigger the AI Swarm.
                      </p>
                    </div>
                  )}
                </GlassCard>

                {/* 6 Recharts Analytics Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chart 1: Productivity Trend */}
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#78716C]">Cognitive Velocity</span>
                        <h3 className="text-sm font-bold text-white mt-0.5" style={{ fontFamily: CONFIG.FONTS.display }}>Productivity & Consistency</h3>
                      </div>
                      <TrendingUp className="w-4 h-4 text-[#E8D5B7] opacity-60" />
                    </div>
                    <ProductivityTrendGraph data={data?.focus_trend?.map(t => ({ day: t.date.substring(5), score: Math.round(t.flow_score * 100), consistency: Math.round(t.flow_score * 90) }))} />
                  </GlassCard>

                  {/* Chart 2: Weekly Focus Heatmap */}
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#78716C]">Sensory Density</span>
                        <h3 className="text-sm font-bold text-white mt-0.5" style={{ fontFamily: CONFIG.FONTS.display }}>Weekly Focus Heatmap</h3>
                      </div>
                      <Activity className="w-4 h-4 text-[#E8D5B7] opacity-60" />
                    </div>
                    <WeeklyFocusHeatmap />
                  </GlassCard>

                  {/* Chart 3: Goal Completion Analytics */}
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#78716C]">Milestones Velocity</span>
                        <h3 className="text-sm font-bold text-white mt-0.5" style={{ fontFamily: CONFIG.FONTS.display }}>Goal Completion Analytics</h3>
                      </div>
                      <Target className="w-4 h-4 text-[#E8D5B7] opacity-60" />
                    </div>
                    <GoalCompletionAnalytics data={data?.goals?.map(g => ({ name: g.title.substring(0, 12), progress: g.completion_percentage, compliance: Math.min(100, g.completion_percentage + 15) }))} />
                  </GlassCard>

                  {/* Chart 4: Cognitive Load Chart */}
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#78716C]">Telemetry Stress</span>
                        <h3 className="text-sm font-bold text-white mt-0.5" style={{ fontFamily: CONFIG.FONTS.display }}>Cognitive Load Chart</h3>
                      </div>
                      <BrainCircuit className="w-4 h-4 text-[#E8D5B7] opacity-60" />
                    </div>
                    <CognitiveLoadChart />
                  </GlassCard>

                  {/* Chart 5: Task Completion Graph */}
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#78716C]">Focus Alignment</span>
                        <h3 className="text-sm font-bold text-white mt-0.5" style={{ fontFamily: CONFIG.FONTS.display }}>Task Duration Analytics</h3>
                      </div>
                      <ListTodo className="w-4 h-4 text-[#E8D5B7] opacity-60" />
                    </div>
                    <TaskCompletionGraph />
                  </GlassCard>

                  {/* Chart 6: AI Recommendation Impact */}
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#78716C]">Agentic Optimizations</span>
                        <h3 className="text-sm font-bold text-white mt-0.5" style={{ fontFamily: CONFIG.FONTS.display }}>AI Recommendation Impact</h3>
                      </div>
                      <Sparkles className="w-4 h-4 text-[#E8D5B7] opacity-60" />
                    </div>
                    <RecommendationImpactGraph />
                  </GlassCard>
                </div>

                {/* Real-time Telemetry activity console log */}
                <GlassCard className="p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#5C5448] flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Live Agent Swarm Console Logs
                    </h3>
                    {isSimulatingTelemetry && (
                      <span className="text-[9px] font-mono bg-[#C2410C]/20 text-[#C2410C] px-2 py-0.5 rounded animate-pulse uppercase font-bold">
                        Receiving Telemetry Stream
                      </span>
                    )}
                  </div>

                  <div className="h-44 bg-black/40 rounded-2xl border border-white/[0.04] p-4 overflow-y-auto font-mono text-[10px] text-[#78716C] space-y-2 leading-relaxed">
                    {automationLogs.slice(-6).map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="text-[#5C5448]">{new Date().toLocaleTimeString()}</span>
                        <span className={log.includes("Telemetry:") ? 'text-[#E8D5B7]' : log.includes("Focus:") ? 'text-[#4D7C5F]' : 'text-[#78716C]'}>
                          &gt; {log}
                        </span>
                      </div>
                    ))}
                  </div>
                </GlassCard>

              </div>

              {/* ── RIGHT COLUMN (5 Columns): INSIGHTS, LOAD, GOALS ────────────── */}
              <div className="lg:col-span-5 space-y-6">

                {/* Simulated telemetry dynamic loading widget */}
                <AnimatePresence>
                  {isSimulatingTelemetry && simulatedLoadRecord && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <GlassCard className="p-5 border-[#B45309]/30 bg-gradient-to-r from-[#B45309]/5 to-transparent">
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-[#E8D5B7] animate-pulse" />
                          <div>
                            <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#E8D5B7]">Active Workspace Capture</h4>
                            <p className="text-[11px] text-[#A09880] mt-0.5">
                              Application: <span className="font-mono text-white">{simulatedLoadRecord.application}</span> | Switches: <span className="font-mono text-white">{simulatedLoadRecord.switches}</span> | Load Index: <span className="font-mono text-white">{simulatedLoadRecord.fatigue_index}</span>
                            </p>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pomodoro Focus Timer Panel (during active sessions) */}
                <AnimatePresence>
                  {activeSession && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <GlassCard className="p-6 bg-gradient-to-br from-[#C2410C]/10 to-transparent border-[#C2410C]/30 flex flex-col items-center gap-4 text-center">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#C2410C] font-mono bg-[#C2410C]/10 px-2 py-0.5 rounded">
                          Flow Session Running
                        </span>

                        <div className="relative w-28 h-28 flex items-center justify-center">
                          {/* Pulsing visual outline */}
                          <motion.div
                            animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.3, 0.15] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-[#C2410C] rounded-full blur-xl pointer-events-none"
                          />
                          <div className="w-24 h-24 rounded-full bg-black/60 border border-[#C2410C]/40 flex items-center justify-center z-10 relative">
                            <span className="text-2xl font-mono font-bold text-white select-none">
                              {formatTime(sessionSeconds)}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3 w-full">
                          <div className="flex justify-between text-[10px] font-mono text-[#A09880] max-w-[200px] mx-auto">
                            <span>Interruptions:</span>
                            <span className="text-white font-bold">{focusInterruptions}</span>
                          </div>

                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setFocusInterruptions(prev => prev + 1)}
                              className="px-3 py-1 bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08] text-[10px] font-mono uppercase rounded-lg text-[#A09880] transition-colors"
                            >
                              Log Interruption
                            </button>
                            <button
                              onClick={endFocusTimer}
                              className="px-4 py-1.5 bg-[#C2410C] hover:bg-[#C2410C]/90 text-[10px] font-mono uppercase font-bold rounded-lg text-white transition-colors"
                            >
                              Complete Cycle
                            </button>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cognitive Load Meter dial */}
                <GlassCard className="p-6 flex flex-col items-center text-center space-y-4">
                  <div className="w-full text-left border-b border-white/[0.05] pb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Cognitive fatigue</span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-[#E8D5B7]" />
                      Cognitive Load Meter
                    </h3>
                  </div>

                  <div className="relative w-36 h-20 flex justify-center items-end overflow-hidden">
                    {/* Semi circle arc outline */}
                    <div className="absolute top-0 w-36 h-36 border-[12px] border-white/[0.03] rounded-full z-0" />

                    {/* Active load color ring */}
                    <div
                      className="absolute top-0 w-36 h-36 border-[12px] border-transparent rounded-full z-10 origin-center transition-transform duration-1000"
                      style={{
                        borderTopColor: (data?.overview?.cognitive_load_average || 0) > 0.5 ? '#C2410C' : '#E8D5B7',
                        borderRightColor: (data?.overview?.cognitive_load_average || 0) > 0.5 ? '#C2410C' : '#E8D5B7',
                        transform: `rotate(${Math.min(180, (data?.overview?.cognitive_load_average || 0.2) * 180) - 135}deg)`
                      }}
                    />

                    {/* Core load readout */}
                    <div className="z-20 text-center pb-2">
                      <span className="text-3xl font-mono font-extrabold text-white">
                        {Math.round((data?.overview?.cognitive_load_average || 0.2) * 100)}%
                      </span>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-[#5C5448] mt-0.5">Fatigue Index</p>
                    </div>
                  </div>

                  <p className="text-xs text-[#A09880] leading-relaxed max-w-xs">
                    {(data?.overview?.cognitive_load_average || 0) > 0.5
                      ? 'Heavy sensory load pocket detected. Pacing intervals recommended to lower context stress.'
                      : 'Cognitive load is fully stabilized inside active workspace flow bounds.'}
                  </p>
                </GlassCard>

                {/* AI Insights & Smart Recommendations Panel */}
                <GlassCard className="p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-4">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                      <Sparkles className="w-4 h-4 text-[#E8D5B7]" />
                      Smart Recommendations
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {data?.recommendations.map((rec) => {
                      const isHigh = rec.priority_score > 0.8;
                      return (
                        <div key={rec.id} className="backdrop-blur-2xl bg-[#252219]/60 border border-white/[0.07] rounded-[20px] p-5 hover:border-[#E8D5B7]/30 transition-all group duration-300 relative overflow-hidden">
                          <div className="flex justify-between items-start gap-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${isHigh ? 'bg-[#C2410C]/10 text-[#C2410C]' : 'bg-[#B45309]/10 text-[#B45309]'
                              }`}>
                              {rec.category}
                            </span>
                            <span className="text-[10px] font-mono text-[#5C5448]">Priority {Math.round(rec.priority_score * 100)}%</span>
                          </div>

                          <h4 className="text-sm font-bold text-white mt-3 group-hover:text-[#E8D5B7] transition-colors">{rec.title}</h4>
                          <p className="text-[11px] text-[#A09880] mt-1.5 leading-relaxed">{rec.description}</p>

                          {rec.is_actionable && (
                            <button
                              onClick={() => triggerRecommendation(rec.id, rec.action_payload)}
                              className="mt-4 w-full h-10 bg-[#E8D5B7] hover:bg-[#FAF8F5] text-[#1C1917] font-bold rounded-xl text-[10px] uppercase font-mono tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Approve & Delegate Task
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-1" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>

                {/* Goal Progress Tracker */}
                <GlassCard className="p-6 space-y-5">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#5C5448] flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Goal Tracking Engine
                    </h3>
                    <button
                      onClick={() => setShowGoalModal(true)}
                      className="text-[#E8D5B7] hover:text-[#FAF8F5] transition-colors"
                    >
                      <PlusCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Goal Switcher Tabs */}
                  <div className="bg-black/20 border border-white/[0.05] p-1 rounded-xl flex gap-1 font-mono text-[9px] font-bold">
                    {(['all', 'long_term', 'short_term'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setGoalTab(tab)}
                        className={`flex-1 py-1.5 rounded-lg transition-colors uppercase tracking-wider ${goalTab === tab ? 'bg-[#E8D5B7] text-[#1C1917]' : 'text-[#A09880] hover:text-white'
                          }`}
                      >
                        {tab.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Status / AI Predict Badge Helper */}
                  {(() => {
                    const renderGoalItem = (g: Goal, isSubGoal = false) => {
                      const isDelayed = g.status === 'delayed' ||
                        (g.projected_completion_date && new Date(g.projected_completion_date) > new Date(g.target_date));

                      return (
                        <div key={g.id} className={`p-4 rounded-2xl bg-black/10 border border-white/[0.03] space-y-3 hover:border-white/[0.08] transition-all group ${isSubGoal ? 'ml-3' : ''
                          }`}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[8px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded ${g.goal_type === 'long_term' ? 'bg-[#B45309]/15 text-[#B45309] border border-[#B45309]/30' : 'bg-[#78716C]/15 text-[#A09880] border border-white/[0.05]'
                                  }`}>
                                  {g.goal_type === 'long_term' ? 'LT' : 'ST'}
                                </span>
                                <h4 className="text-xs font-bold text-white group-hover:text-[#E8D5B7] transition-colors">{g.title}</h4>
                              </div>
                              {g.description && <p className="text-[10px] text-[#78716C] leading-normal">{g.description}</p>}
                              <p className="text-[9px] text-[#A09880] font-mono">Target: {new Date(g.target_date).toLocaleDateString()}</p>
                            </div>

                            {/* AI Predict Badge */}
                            <div className="flex flex-col items-end gap-1.5">
                              {g.status === 'completed' ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wide bg-[#4D7C5F]/20 text-[#4D7C5F] border border-[#4D7C5F]/30">
                                  COMPLETED
                                </span>
                              ) : isDelayed ? (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wide bg-[#C2410C]/20 text-[#C2410C] border border-[#C2410C]/30 flex items-center gap-1">
                                  <Clock3 className="w-2.5 h-2.5 animate-pulse" /> LAGGING
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wide bg-[#4D7C5F]/20 text-[#4D7C5F] border border-[#4D7C5F]/30">
                                  ON TRACK
                                </span>
                              )}
                              <span className="text-xs font-mono font-extrabold text-[#E8D5B7]">
                                {Math.round(g.completion_percentage)}%
                              </span>
                            </div>
                          </div>

                          {/* Progress Line */}
                          <div className="w-full bg-white/[0.03] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${g.status === 'completed' ? 'bg-[#4D7C5F]' : isDelayed ? 'bg-[#C2410C]' : 'bg-[#E8D5B7]'
                                }`}
                              style={{ width: `${g.completion_percentage}%` }}
                            />
                          </div>

                          {/* Milestone Checklist */}
                          {g.key_results?.milestones && g.key_results.milestones.length > 0 ? (
                            <div className="pt-2 border-t border-white/[0.04] space-y-2">
                              <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#5C5448] flex items-center gap-1 font-mono">
                                <ListTodo className="w-3 h-3 text-[#E8D5B7]" /> Key Results Checklist
                              </span>
                              <div className="space-y-1.5 pl-1.5">
                                {g.key_results.milestones.map((milestone: any, idx: number) => (
                                  <div
                                    key={idx}
                                    onClick={() => handleToggleMilestone(g, idx)}
                                    className="flex items-center gap-2 cursor-pointer select-none group/item"
                                  >
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${milestone.done
                                        ? 'bg-[#4D7C5F]/20 border-[#4D7C5F] text-[#4D7C5F]'
                                        : 'border-white/[0.15] group-hover/item:border-[#E8D5B7]/50'
                                      }`}>
                                      {milestone.done && <span className="text-[9px] font-bold">✓</span>}
                                    </div>
                                    <span className={`text-[10px] transition-colors ${milestone.done ? 'line-through text-[#5C5448]' : 'text-[#A09880] group-hover/item:text-white'
                                      }`}>
                                      {milestone.step}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            g.status !== 'completed' && (
                              <button
                                onClick={() => loadMilestoneSuggestions(g)}
                                className="text-[9px] font-mono text-[#E8D5B7] hover:text-[#FAF8F5] flex items-center gap-1 font-bold mt-1 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] px-2 py-1 rounded-lg transition-colors"
                              >
                                <Sparkles className="w-3 h-3 text-[#E8D5B7] fill-current" />
                                AI Generate Milestones
                              </button>
                            )
                          )}
                        </div>
                      );
                    };

                    const goals = data?.goals || [];

                    if (goals.length === 0) {
                      return (
                        <div className="py-8 text-center text-xs text-[#A09880] font-mono border border-dashed border-white/[0.07] rounded-2xl bg-black/10">
                          No goals set for this window context.
                        </div>
                      );
                    }

                    if (goalTab === 'long_term') {
                      const lts = goals.filter(g => g.goal_type === 'long_term');
                      if (lts.length === 0) {
                        return <div className="text-center py-4 text-xs font-mono text-[#5C5448]">No active Long-term goals found.</div>;
                      }
                      return <div className="space-y-4">{lts.map(g => renderGoalItem(g))}</div>;
                    }

                    if (goalTab === 'short_term') {
                      const sts = goals.filter(g => g.goal_type !== 'long_term');
                      if (sts.length === 0) {
                        return <div className="text-center py-4 text-xs font-mono text-[#5C5448]">No active Short-term goals found.</div>;
                      }
                      return <div className="space-y-4">{sts.map(g => renderGoalItem(g))}</div>;
                    }

                    // 'all' Hierarchical Rollup view
                    const lts = goals.filter(g => g.goal_type === 'long_term');
                    const stsWithNoParent = goals.filter(g => g.goal_type !== 'long_term' && !g.parent_goal_id);

                    return (
                      <div className="space-y-6">
                        {/* 1. Long term parent elements + nested short terms */}
                        {lts.map(parent => {
                          const children = goals.filter(g => g.parent_goal_id === parent.id);
                          return (
                            <div key={parent.id} className="space-y-3">
                              {renderGoalItem(parent)}

                              {children.length > 0 && (
                                <div className="border-l border-white/[0.08] pl-4 ml-5 space-y-3 relative">
                                  {children.map(child => renderGoalItem(child, true))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* 2. Standalone short terms */}
                        {stsWithNoParent.length > 0 && (
                          <div className="space-y-3 pt-3 border-t border-white/[0.05]">
                            <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#5C5448] font-mono">Standalone Goals</span>
                            {stsWithNoParent.map(g => renderGoalItem(g))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </GlassCard>

              </div>

            </div>
          )}

        </div>

        {/* ── CREATE GOAL MODAL ───────────────────────────────────────────── */}
        <AnimatePresence>
          {showGoalModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#1E1B18] border border-white/[0.07] rounded-[24px] p-6 shadow-2xl space-y-6"
              >
                <div className="border-b border-white/[0.05] pb-3">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: CONFIG.FONTS.display }}>Add Productivity Goal</h3>
                  <p className="text-xs text-[#A09880] mt-0.5">Define milestones and deadlines for the AI supervisor agent</p>
                </div>

                <form onSubmit={handleGoalSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Goal Objective</label>
                    <input
                      type="text"
                      placeholder="e.g. Swarm Router Integration..."
                      value={newGoalTitle}
                      onChange={e => setNewGoalTitle(e.target.value)}
                      required
                      className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 text-[#F5F0E8]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Description</label>
                    <textarea
                      placeholder="Specify core target deliverables..."
                      value={newGoalDesc}
                      onChange={e => setNewGoalDesc(e.target.value)}
                      className="w-full h-24 bg-black/30 border border-white/[0.07] rounded-xl p-4 text-xs focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 text-[#F5F0E8] resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Target Deadline</label>
                    <input
                      type="date"
                      value={newGoalDate}
                      onChange={e => setNewGoalDate(e.target.value)}
                      required
                      className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 text-[#F5F0E8]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Goal Type</label>
                    <select
                      value={newGoalType}
                      onChange={e => setNewGoalType(e.target.value as 'short_term' | 'long_term')}
                      className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#E8D5B7]/50 text-[#F5F0E8]"
                    >
                      <option value="short_term">Short-Term Goal</option>
                      <option value="long_term">Long-Term Goal</option>
                    </select>
                  </div>

                  {newGoalType === 'short_term' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Link to Parent Goal (Optional)</label>
                      <select
                        value={newGoalParentId}
                        onChange={e => setNewGoalParentId(e.target.value)}
                        className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#E8D5B7]/50 text-[#F5F0E8]"
                      >
                        <option value="">No parent linkage</option>
                        {data?.goals
                          ?.filter(g => g.goal_type === 'long_term')
                          ?.map(g => (
                            <option key={g.id} value={g.id}>{g.title}</option>
                          ))
                        }
                      </select>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setShowGoalModal(false)}
                      className="px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase text-[#A09880] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingGoal}
                      className="px-5 py-2 bg-[#E8D5B7] text-[#1C1917] text-xs font-mono font-bold tracking-wider uppercase rounded-xl hover:bg-[#FAF8F5] transition-all disabled:opacity-50"
                    >
                      {isSubmittingGoal ? 'Creating...' : 'Create Goal'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── POMODORO SELECTION MODAL ────────────────────────────────────── */}
        <AnimatePresence>
          {isFocusModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-[#1E1B18] border border-white/[0.07] rounded-[24px] p-6 shadow-2xl space-y-6"
              >
                <div className="border-b border-white/[0.05] pb-3">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: CONFIG.FONTS.display }}>Start Focus Session</h3>
                  <p className="text-xs text-[#A09880] mt-0.5">Activate a Pomodoro cycle and select a target goal</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#5C5448]">Optional: Link to Goal</label>
                    <select
                      value={selectedGoalForFocus}
                      onChange={e => setSelectedGoalForFocus(e.target.value)}
                      className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#E8D5B7]/50 text-[#F5F0E8]"
                    >
                      <option value="">No goal (General Study/Work)</option>
                      {data?.goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-3 justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => setIsFocusModalOpen(false)}
                      className="px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase text-[#A09880] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={startFocusTimer}
                      className="px-5 py-2 bg-[#E8D5B7] text-[#1C1917] text-xs font-mono font-bold tracking-wider uppercase rounded-xl hover:bg-[#FAF8F5] transition-all"
                    >
                      Start Focus
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── AI MILESTONE SUGGESTIONS MODAL ──────────────────────────────── */}
        <AnimatePresence>
          {showMilestoneDialog && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-[#1E1B18] border border-white/[0.07] rounded-[24px] p-6 shadow-2xl space-y-6"
              >
                <div className="border-b border-white/[0.05] pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#E8D5B7] flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 fill-current" />
                      AI Planning Swarm
                    </span>
                    <h3 className="text-base font-bold text-white mt-1" style={{ fontFamily: CONFIG.FONTS.display }}>
                      Milestone Recommendations
                    </h3>
                    <p className="text-[11px] text-[#A09880] mt-0.5">
                      Target: "{selectedGoalForMilestones?.title}"
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMilestoneDialog(false)}
                    className="text-[#78716C] hover:text-white text-xs font-mono"
                  >
                    Close
                  </button>
                </div>

                {loadingSuggestions ? (
                  <div className="space-y-4 py-4">
                    {/* Premium Shimmer Skeletons */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse" style={{ animationDuration: '1.5s' }}>
                        <div className="w-4 h-4 rounded bg-white/5 border border-white/[0.05]" />
                        <div className="h-3.5 bg-white/5 rounded-lg w-3/4" />
                      </div>
                    ))}
                    <p className="text-[10px] text-[#78716C] font-mono text-center pt-2">
                      Agent planning heuristics calculations in progress...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[11px] text-[#A09880] leading-relaxed">
                      Our multi-agent planning swarm has calculated the optimal incremental steps to achieve your target milestone. Review and edit the proposed key results before committing.
                    </p>

                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {suggestedMilestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-black/20 border border-white/[0.03] rounded-xl hover:border-white/[0.08] transition-all group"
                        >
                          <input
                            type="checkbox"
                            checked={m.done}
                            onChange={(e) => {
                              const updated = [...suggestedMilestones];
                              updated[idx].done = e.target.checked;
                              setSuggestedMilestones(updated);
                            }}
                            className="w-4 h-4 rounded border-white/[0.1] bg-black/40 text-[#E8D5B7] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={m.step}
                            onChange={(e) => {
                              const updated = [...suggestedMilestones];
                              updated[idx].step = e.target.value;
                              setSuggestedMilestones(updated);
                            }}
                            className="flex-1 bg-transparent border-0 p-0 text-xs focus:outline-none focus:ring-0 text-[#F5F0E8] font-medium"
                          />
                          <button
                            onClick={() => {
                              const updated = suggestedMilestones.filter((_, i) => i !== idx);
                              setSuggestedMilestones(updated);
                            }}
                            className="text-[#5C5448] hover:text-[#C2410C] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={() => setSuggestedMilestones([...suggestedMilestones, { step: "New custom milestone step...", done: false }])}
                        className="text-[10px] font-mono text-[#E8D5B7] hover:underline flex items-center gap-1.5 pl-2 font-bold"
                      >
                        + Add Custom Step
                      </button>
                    </div>

                    <div className="flex gap-3 justify-end pt-3 border-t border-white/[0.05]">
                      <button
                        type="button"
                        onClick={() => setShowMilestoneDialog(false)}
                        className="px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase text-[#A09880] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAcceptMilestones}
                        disabled={suggestedMilestones.length === 0}
                        className="px-5 py-2 bg-[#E8D5B7] text-[#1C1917] text-xs font-mono font-bold tracking-wider uppercase rounded-xl hover:bg-[#FAF8F5] transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-lg"
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        Commit Swarm Plan
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AuthGuard>
  );
}
