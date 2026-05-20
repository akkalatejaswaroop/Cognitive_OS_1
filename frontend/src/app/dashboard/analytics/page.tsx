"use client"

import React from "react"
import { motion } from "framer-motion"
import { 
  BarChart3, Activity, Zap, Cpu, Sparkles, 
  ArrowUpRight, ArrowDownRight, Clock, ShieldCheck
} from "lucide-react"
import { AuthGuard } from "@/components/AuthGuard"

export default function AnalyticsPage() {
  return (
    <AuthGuard allowedRoles={["admin", "premium"]}>
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
                <BarChart3 className="w-3.5 h-3.5" />
                Premium Telemetry
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-medium tracking-tight text-foreground">
                Telemetry & <span className="font-serif italic font-semibold text-foreground">Analytics</span>
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl font-light leading-relaxed">
                In-depth metrics monitoring agent executions, prompt latency times, token allocations, and cognitive performance logs.
              </p>
            </div>
          </div>
        </motion.div>

        {/* High-Fidelity Stats Deck */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Token Processing", val: "1.4M / hr", change: "+12.4%", inc: true, icon: Zap },
            { label: "Execution Speed", val: "142 ms", change: "-8.3%", inc: true, icon: Clock },
            { label: "Agent Success", val: "99.4%", change: "+0.2%", inc: true, icon: ShieldCheck },
            { label: "Compute Density", val: "4.8 Cores", change: "-2.1%", inc: false, icon: Cpu },
          ].map((stat, idx) => {
            const IconComponent = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="glass-panel border border-border rounded-2xl p-6 flex flex-col justify-between gap-4 transition-all hover:border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                  <div className="p-2 bg-muted rounded-xl border border-border/80">
                    <IconComponent className="w-4 h-4 text-foreground/80" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">{stat.val}</h3>
                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
                    {stat.inc ? (
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        {stat.change}
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-0.5">
                        <ArrowDownRight className="w-3 h-3" />
                        {stat.change}
                      </span>
                    )}
                    <span className="text-muted-foreground font-light">vs last epoch</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Chart representation */}
        <div className="glass-panel border border-border rounded-3xl p-8 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-display">System Throughput Analysis</h3>
              <p className="text-xs text-muted-foreground">Tokens processed dynamically over active swarm cycles</p>
            </div>

            <div className="flex gap-2">
              {["1h", "24h", "7d"].map((t) => (
                <button 
                  key={t}
                  className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg border ${
                    t === "24h" ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Abstract futuristic graphical wave representation */}
          <div className="h-48 w-full flex items-end justify-between gap-1 pt-4 relative">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
              {[1, 2, 3, 4].map((gridLine) => (
                <div key={gridLine} className="w-full border-t border-dashed border-border" />
              ))}
            </div>

            {[30, 45, 35, 60, 50, 75, 65, 80, 70, 95, 85, 99].map((height, index) => (
              <div 
                key={index} 
                className="flex-1 bg-gradient-to-t from-primary/10 to-primary border-t-2 border-primary rounded-t-lg transition-all duration-1000 z-10" 
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

      </div>
    </AuthGuard>
  )
}
