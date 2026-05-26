"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  Zap, 
  Clock, 
  Mail, 
  Bell, 
  ChevronRight, 
  Play, 
  Pause, 
  Settings, 
  Plus, 
  BarChart3, 
  Search,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Bot
} from 'lucide-react';

// --- Components ---

const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

const Badge = ({ children, color = "blue" }: { children: React.ReactNode, color?: "blue" | "green" | "purple" | "orange" }) => {
  const colors = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color]}`}>
      {children}
    </span>
  );
};

const AssistantOrb = () => (
  <motion.div 
    drag
    dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
    whileHover={{ scale: 1.1 }}
    className="fixed bottom-8 right-8 z-50 cursor-pointer"
  >
    <div className="relative">
      <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
      <div className="bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 p-4 rounded-full shadow-lg shadow-blue-500/40 border border-white/20">
        <Bot className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

// --- Sections ---

const OverviewStats = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {[
      { label: "Total Automations", value: "24", icon: Zap, color: "text-yellow-400", change: "+12%" },
      { label: "Success Rate", value: "99.2%", icon: Activity, color: "text-green-400", change: "+0.4%" },
      { label: "Memory Recall", value: "1.2k", icon: Cpu, color: "text-blue-400", change: "+148" },
      { label: "Tokens Saved", value: "840k", icon: BarChart3, color: "text-purple-400", change: "+22%" },
    ].map((stat, i) => (
      <GlassCard key={i} className="group relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
            <p className="text-green-400 text-[10px] mt-1 font-bold">{stat.change}</p>
          </div>
          <div className={`${stat.color} p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform`}>
            <stat.icon className="w-5 h-5" />
          </div>
        </div>
      </GlassCard>
    ))}
  </div>
);

const ActiveWorkflows = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center px-1">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-500" />
        Active Workflows
      </h2>
      <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">View all</button>
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {[
        { name: "Quarterly Report Gen", agent: "Research", steps: 8, progress: 65, status: "processing" },
        { name: "Team Sync Follow-up", agent: "Executive", steps: 3, progress: 100, status: "completed" }
      ].map((wf, i) => (
        <GlassCard key={i} className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex gap-3">
              <div className={`p-3 rounded-xl ${wf.status === 'processing' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{wf.name}</h4>
                <p className="text-xs text-gray-500">Agent: {wf.agent}</p>
              </div>
            </div>
            <Badge color={wf.status === 'processing' ? 'blue' : 'green'}>{wf.status}</Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{wf.steps} Steps</span>
              <span>{wf.progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${wf.progress}%` }}
                className={`h-full ${wf.status === 'processing' ? 'bg-blue-500' : 'bg-green-500'}`}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
             <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><Pause className="w-4 h-4" /></button>
             <button className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><Settings className="w-4 h-4" /></button>
          </div>
        </GlassCard>
      ))}
    </div>
  </div>
);

const SmartReminders = () => (
  <div className="space-y-4">
    <h2 className="text-lg font-bold text-white flex items-center gap-2">
      <Bell className="w-4 h-4 text-red-400" />
      Smart Reminders
    </h2>
    <div className="space-y-3">
      {[
        { text: "Submit Project Alpha Report", due: "2h left", sps: 8.4, cat: "Work" },
        { text: "Call Alex re: Logistics", due: "15:30", sps: 7.2, cat: "Personal" },
        { text: "Prepare for Board Meeting", due: "Tomorrow", sps: 9.1, cat: "Urgent" }
      ].map((rem, i) => (
        <GlassCard key={i} className="!p-4 hover:translate-x-1">
          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <div className={`w-1 h-8 rounded-full ${rem.sps > 8.5 ? 'bg-red-500' : rem.sps > 7.5 ? 'bg-orange-500' : 'bg-blue-500'}`} />
              <div>
                <p className="text-sm font-medium text-white">{rem.text}</p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {rem.due} • {rem.cat}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase">SPS</p>
              <p className="text-sm font-bold text-white">{rem.sps}</p>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  </div>
);

const AIInsights = () => (
  <GlassCard className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 bg-indigo-500/20 rounded-lg">
        <Bot className="w-4 h-4 text-indigo-400" />
      </div>
      <h2 className="text-sm font-bold text-white">Cognitive Insights</h2>
    </div>
    <div className="space-y-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
        <p className="text-xs text-blue-300 font-medium mb-1">Efficiency Boost</p>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          I've noticed you spend 40% of your morning on emails. Should I activate the 
          <span className="text-white font-bold italic"> Smart Draft </span> 
          autonomous mode for you?
        </p>
        <button className="mt-3 text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
          Enable Auto-Draft
        </button>
      </div>
      
      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
        <p className="text-xs text-purple-300 font-medium mb-1">Context Alert</p>
        <p className="text-[11px] text-gray-300 leading-relaxed">
          The Board Meeting DAG is stalled due to a missing citation from the "Alpha Report". 
          I am currently re-routing the Research agent.
        </p>
      </div>
    </div>
  </GlassCard>
);

// --- Sidebar ---

const Sidebar = () => {
  const [active, setActive] = useState('Dashboard');
  const navItems = [
    { label: 'Dashboard', icon: Zap },
    { label: 'Workflows', icon: Cpu },
    { label: 'Intelligence', icon: Bot },
    { label: 'Analytics', icon: BarChart3 },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 h-screen bg-black/40 backdrop-blur-3xl border-r border-white/10 hidden lg:flex flex-col p-6 fixed left-0 top-0">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Zap className="text-white w-5 h-5 fill-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tighter">COGNITIVE OS</h1>
      </div>
      
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => setActive(item.label)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              active === item.label 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>
      
      <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-xs font-bold">AR</div>
          </div>
          <div>
            <p className="text-xs font-bold text-white">Alex Rivera</p>
            <p className="text-[10px] text-gray-500">Pro Plan • Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function AutomationDashboard() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <Sidebar />
      <AssistantOrb />

      <main className="lg:ml-64 p-6 md:p-10 relative">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-4xl font-bold tracking-tight mb-2"
            >
              Automation Hub
            </motion.h1>
            <p className="text-gray-500 text-sm">Orchestrating 24 active agents across 8 cognitive sessions.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search workflows..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Main Content Area */}
          <div className="col-span-12 lg:col-span-8 space-y-10">
            <OverviewStats />
            <ActiveWorkflows />
            
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Trigger Activity
              </h2>
              <GlassCard className="!p-0 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {[
                    { event: "Email Received", source: "Alex R.", time: "2 min ago", type: "trigger" },
                    { event: "Research Complete", source: "Alpha Report", time: "12 min ago", type: "update" },
                    { event: "Reminder Triggered", source: "Board Sync", time: "1h ago", type: "alert" }
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500 animate-pulse' : 'bg-white/20'}`} />
                        <div>
                          <p className="text-sm font-medium text-white">{log.event}</p>
                          <p className="text-[10px] text-gray-500">{log.source}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">{log.time}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <AIInsights />
            <SmartReminders />
            
            <GlassCard className="p-6">
               <h3 className="text-sm font-bold text-white mb-4">Automation Toggles</h3>
               <div className="space-y-4">
                 {[
                   { label: "Autonomous Email Drafting", active: true },
                   { label: "Predictive Deadline Adjust", active: false },
                   { label: "Context-Aware Research", active: true }
                 ].map((t, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <span className="text-xs text-gray-400">{t.label}</span>
                     <button className={`w-8 h-4 rounded-full relative transition-colors ${t.active ? 'bg-blue-600' : 'bg-white/10'}`}>
                       <div className={`absolute top-1 w-2 h-2 rounded-full bg-white transition-all ${t.active ? 'left-5' : 'left-1'}`} />
                     </button>
                   </div>
                 ))}
               </div>
            </GlassCard>
          </div>

        </div>

        {/* Workflow History (Footer Section) */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Execution History
          </h2>
          <GlassCard className="overflow-x-auto !p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase text-gray-500 tracking-widest border-b border-white/5">
                  <th className="px-6 py-4 font-bold">Workflow ID</th>
                  <th className="px-6 py-4 font-bold">Start Time</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Duration</th>
                  <th className="px-6 py-4 font-bold">Agents</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[1, 2, 3].map((_, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <code className="text-[11px] text-blue-400 font-mono">wf_0x{8293 + i}</code>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-300">May 26, 2026 • 14:02</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-medium text-gray-300">Success</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">4.2s</td>
                    <td className="px-6 py-4">
                       <div className="flex -space-x-2">
                         {[1, 2, 3].map(a => (
                           <div key={a} className="w-6 h-6 rounded-full bg-white/10 border border-black flex items-center justify-center text-[8px] font-bold">A{a}</div>
                         ))}
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
