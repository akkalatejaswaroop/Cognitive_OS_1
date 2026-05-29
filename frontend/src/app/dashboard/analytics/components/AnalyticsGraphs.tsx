"use client";

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Bar,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  ReferenceArea
} from 'recharts';
import { 
  Zap, 
  Activity, 
  Target, 
  BrainCircuit, 
  ListTodo, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

// Design System Colors matching User Global Rules
const COLORS = {
  cream: '#E8D5B7',      // Warm amber-cream
  ink: '#1C1917',        // Rich near-black
  surface: '#141210',    // Warm dark
  card: '#1E1B18',       // Slightly lifted card surface
  ember: '#C2410C',      // Terracotta highlight
  sage: '#4D7C5F',       // Grounded forest green
  gold: '#B45309',       // Deep intelligence amber
  muted: '#78716C',      // Warm gray
  grid: 'rgba(255, 255, 255, 0.04)'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E1B18]/90 border border-white/[0.08] p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-[10px] uppercase tracking-widest font-mono text-[#78716C] mb-1">{label}</p>
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center gap-6 mt-1 text-xs font-sans">
            <span className="text-[#A09880] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              {item.name}
            </span>
            <span className="font-mono font-bold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================ #
//  1. PRODUCTIVITY TREND GRAPH                                                #
// ============================================================================ #
export function ProductivityTrendGraph({ data }: { data?: any[] }) {
  const defaultData = [
    { day: 'Mon', score: 72, consistency: 80 },
    { day: 'Tue', score: 85, consistency: 88 },
    { day: 'Wed', score: 64, consistency: 70 },
    { day: 'Thu', score: 91, consistency: 92 },
    { day: 'Fri', score: 78, consistency: 82 },
    { day: 'Sat', score: 55, consistency: 60 },
    { day: 'Sun', score: 80, consistency: 85 }
  ];

  const chartData = data || defaultData;

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.cream} stopOpacity={0.25} />
              <stop offset="95%" stopColor={COLORS.cream} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="consistencyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis 
            dataKey="day" 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
          />
          <YAxis 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            name="Productivity Index" 
            dataKey="score" 
            stroke={COLORS.cream} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#scoreGrad)" 
            isAnimationActive={true}
          />
          <Area 
            type="monotone" 
            name="Consistency Index" 
            dataKey="consistency" 
            stroke={COLORS.gold} 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#consistencyGrad)" 
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================ #
//  2. WEEKLY FOCUS HEATMAP (Scatter 2D Grid)                                   #
// ============================================================================ #
export function WeeklyFocusHeatmap() {
  // Mapped: X is Day (1-7), Y is hour interval (Morning: 1, Afternoon: 2, Evening: 3, Night: 4)
  const heatmapData = [
    { day: 'Mon', slot: 'Morning', duration: 120, flow: 85 },
    { day: 'Mon', slot: 'Afternoon', duration: 60, flow: 75 },
    { day: 'Mon', slot: 'Evening', duration: 180, flow: 90 },
    { day: 'Tue', slot: 'Morning', duration: 150, flow: 88 },
    { day: 'Tue', slot: 'Afternoon', duration: 240, flow: 92 },
    { day: 'Wed', slot: 'Morning', duration: 90, flow: 70 },
    { day: 'Wed', slot: 'Night', duration: 120, flow: 80 },
    { day: 'Thu', slot: 'Morning', duration: 180, flow: 94 },
    { day: 'Thu', slot: 'Afternoon', duration: 180, flow: 88 },
    { day: 'Fri', slot: 'Morning', duration: 120, flow: 86 },
    { day: 'Fri', slot: 'Evening', duration: 240, flow: 95 },
    { day: 'Sat', slot: 'Afternoon', duration: 90, flow: 78 },
    { day: 'Sun', slot: 'Evening', duration: 150, flow: 89 }
  ];

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} />
          <XAxis 
            type="category" 
            dataKey="day" 
            name="Day" 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
            allowDuplicatedCategory={false}
          />
          <YAxis 
            type="category" 
            dataKey="slot" 
            name="Time Block" 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
            allowDuplicatedCategory={false}
          />
          <ZAxis 
            type="number" 
            dataKey="duration" 
            range={[80, 450]} 
            name="Duration" 
            unit=" mins" 
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-[#1E1B18]/90 border border-white/[0.08] p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans">
                    <p className="text-[10px] uppercase tracking-widest font-mono text-[#78716C] mb-1">{item.day} • {item.slot}</p>
                    <div className="space-y-1 mt-1">
                      <p className="text-white">Duration: <span className="font-mono font-bold">{item.duration} mins</span></p>
                      <p className="text-[#E8D5B7]">Flow Score: <span className="font-mono font-bold">{item.flow}%</span></p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Scatter 
            name="Focus Density" 
            data={heatmapData} 
            fill={COLORS.cream}
          >
            {heatmapData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.flow >= 90 ? COLORS.sage : entry.flow >= 80 ? COLORS.cream : COLORS.gold} 
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================ #
//  3. GOAL COMPLETION ANALYTICS                                                #
// ============================================================================ #
export function GoalCompletionAnalytics({ data }: { data?: any[] }) {
  const defaultGoals = [
    { name: 'API Router Sweep', progress: 100, compliance: 100 },
    { name: 'Swarm Telemetry', progress: 80, compliance: 90 },
    { name: 'Knowledge Capture', progress: 65, compliance: 85 },
    { name: 'Predictive Scorer', progress: 45, compliance: 75 },
    { name: 'Deployment Script', progress: 20, compliance: 40 }
  ];

  const chartData = data || defaultGoals;

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            stroke={COLORS.muted} 
            fontSize={9} 
            fontFamily="Outfit"
            tickLine={false} 
          />
          <YAxis 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            name="Progress" 
            dataKey="progress" 
            barSize={16} 
            radius={[4, 4, 0, 0]}
            fill={COLORS.cream}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.progress >= 100 ? COLORS.sage : COLORS.cream} 
              />
            ))}
          </Bar>
          <Line 
            type="monotone" 
            name="Compliance Velocity" 
            dataKey="compliance" 
            stroke={COLORS.gold} 
            strokeWidth={2}
            dot={{ r: 3, fill: COLORS.gold }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================ #
//  4. COGNITIVE LOAD CHART (Fatigue and App Switches)                          #
// ============================================================================ #
export function CognitiveLoadChart({ data }: { data?: any[] }) {
  const defaultData = [
    { hour: '09:00', fatigue: 0.15, switches: 4 },
    { hour: '11:00', fatigue: 0.28, switches: 8 },
    { hour: '13:00', fatigue: 0.42, switches: 12 },
    { hour: '15:00', fatigue: 0.68, switches: 18 }, // High Stress Peak
    { hour: '17:00', fatigue: 0.52, switches: 9 },
    { hour: '19:00', fatigue: 0.35, switches: 6 }
  ];

  const chartData = (data || defaultData).map(item => ({
    ...item,
    fatiguePercent: Math.round(item.fatigue * 100)
  }));

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis 
            dataKey="hour" 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
          />
          <YAxis 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Overload Highlight zone */}
          <ReferenceArea 
            y1={60} 
            y2={100} 
            fill={COLORS.ember} 
            fillOpacity={0.06} 
            label={{ 
              value: 'OVERLOAD DANGER ZONE', 
              fill: COLORS.ember, 
              fontSize: 8, 
              position: 'insideTopRight',
              fontFamily: 'Outfit',
              fontWeight: 'bold',
              letterSpacing: '0.05em'
            }} 
          />

          <Bar 
            name="Context Switches" 
            dataKey="switches" 
            barSize={12}
            radius={[3, 3, 0, 0]}
            fill={COLORS.gold} 
            opacity={0.6}
          />
          <Line 
            type="monotone" 
            name="Fatigue Index (%)" 
            dataKey="fatiguePercent" 
            stroke={COLORS.ember} 
            strokeWidth={2.5}
            dot={{ r: 4, fill: COLORS.ember }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================ #
//  5. TASK COMPLETION GRAPH (Estimation vs Actual)                            #
// ============================================================================ #
export function TaskCompletionGraph() {
  const taskData = [
    { task: 'Swagger routes', estimated: 60, actual: 45 },
    { task: 'DB Migrations', estimated: 30, actual: 40 },
    { task: 'Service Math', estimated: 120, actual: 110 },
    { task: 'E2E Testing', estimated: 90, actual: 130 },
    { task: 'UI Widgets', estimated: 180, actual: 150 }
  ];

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={taskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis 
            dataKey="task" 
            stroke={COLORS.muted} 
            fontSize={9} 
            fontFamily="Outfit"
            tickLine={false} 
          />
          <YAxis 
            stroke={COLORS.muted} 
            fontSize={10} 
            fontFamily="Outfit"
            tickLine={false} 
            unit="m"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            name="Estimated Time" 
            dataKey="estimated" 
            barSize={12} 
            radius={[3, 3, 0, 0]}
            fill={COLORS.cream} 
            opacity={0.3}
          />
          <Bar 
            name="Actual Duration" 
            dataKey="actual" 
            barSize={12} 
            radius={[3, 3, 0, 0]}
            fill={COLORS.cream}
          >
            {taskData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.actual <= entry.estimated ? COLORS.sage : COLORS.ember} 
              />
            ))}
          </Bar>
          <Line 
            type="monotone" 
            name="Estimation Bounds" 
            dataKey="estimated" 
            stroke={COLORS.muted} 
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================ #
//  6. AI RECOMMENDATION IMPACT GRAPH (Before vs After)                         #
// ============================================================================ #
export function RecommendationImpactGraph() {
  const impactData = [
    { name: 'Focus Hours', before: 12, after: 24, fill: COLORS.sage },
    { name: 'Context Switches', before: 18, after: 6, fill: COLORS.cream },
    { name: 'Workplace fatigue', before: 68, after: 22, fill: COLORS.gold }
  ];

  return (
    <div className="h-64 w-full relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={impactData}>
          <PolarGrid stroke={COLORS.grid} />
          <PolarAngleAxis 
            dataKey="name" 
            stroke={COLORS.muted} 
            fontSize={10}
            fontFamily="Outfit"
          />
          <Tooltip 
            content={({ active, payload }: any) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-[#1E1B18]/90 border border-white/[0.08] p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-sans">
                    <p className="text-[10px] uppercase tracking-widest font-mono text-[#E8D5B7] mb-2">{item.name}</p>
                    <div className="space-y-1">
                      <p className="text-[#A09880]">Before AI: <span className="font-mono font-bold text-[#C2410C]">{item.before}</span></p>
                      <p className="text-white">After AI (Optimized): <span className="font-mono font-bold text-[#4D7C5F]">{item.after}</span></p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Radar 
            name="Baseline Habits" 
            dataKey="before" 
            stroke={COLORS.ember} 
            fill={COLORS.ember} 
            fillOpacity={0.2} 
          />
          <Radar 
            name="AI Assisted Flow" 
            dataKey="after" 
            stroke={COLORS.sage} 
            fill={COLORS.sage} 
            fillOpacity={0.3} 
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
