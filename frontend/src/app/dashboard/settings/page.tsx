"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Sliders, Sparkles, Check, Bell, 
  ShieldAlert, Activity, Terminal, 
  Image, RefreshCw, Eye, Sparkle
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

const sanitizeUrl = (url: string) => {
  if (!url) return "";
  const lowerUrl = url.trim().toLowerCase();
  if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("vbscript:") || lowerUrl.startsWith("data:text/html")) {
    return "";
  }
  return url;
};

// Curated high-end abstract minimalist avatars fitting Cognitive OS color philosophy
const AVATAR_PRESETS = [
  {
    name: "Amber Eclipse",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' fill='%231C1917'/><circle cx='50' cy='50' r='30' fill='%23E8D5B7'/><circle cx='65' cy='50' r='30' fill='%231C1917'/></svg>"
  },
  {
    name: "Sage Ripple",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' fill='%23FAF8F5'/><circle cx='50' cy='50' r='35' stroke='%234D7C5F' stroke-width='2'/><circle cx='50' cy='50' r='20' fill='%234D7C5F'/></svg>"
  },
  {
    name: "Terracotta Orb",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' fill='%231C1917'/><circle cx='50' cy='50' r='35' fill='%23C2410C'/><circle cx='35' cy='35' r='8' fill='%23E8D5B7'/></svg>"
  },
  {
    name: "Obsidian Grid",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' fill='%23E8D5B7'/><rect x='20' y='20' width='60' height='60' rx='10' stroke='%231C1917' stroke-width='3'/><line x1='20' y1='50' x2='80' y2='50' stroke='%231C1917' stroke-width='2'/><line x1='50' y1='20' x2='50' y2='80' stroke='%231C1917' stroke-width='2'/></svg>"
  },
  {
    name: "Gold Aura",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' fill='%231C1917'/><circle cx='50' cy='50' r='20' fill='%23B45309'/><circle cx='50' cy='50' r='12' fill='%23E8D5B7'/></svg>"
  },
  {
    name: "Sage Forest",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='none'><rect width='100' height='100' fill='%234D7C5F'/><circle cx='50' cy='50' r='25' fill='%23FAF8F5'/><circle cx='55' cy='45' r='10' fill='%234D7C5F'/></svg>"
  }
];

type TabType = "identity" | "engine" | "interface";

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<TabType>("identity");
  
  // Form states
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState("");
  
  // Preferences states
  const [tone, setTone] = useState<"editorial" | "technical" | "concise" | "creative">("editorial");
  const [creativity, setCreativity] = useState(0.7);
  const [model, setModel] = useState("gemini-3.1-pro");
  const [density, setDensity] = useState<"default" | "dense">("default");
  const [emailDigest, setEmailDigest] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);
  const [instructions, setInstructions] = useState("");

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  // Initialize values from auth store
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- init from user data
      // eslint-disable-next-line react-hooks/set-state-in-effect -- init form from user
      setName(user.name || "");
      setAvatarUrl(user.avatar_url || AVATAR_PRESETS[0].url);
      
      // Determine if avatar is a preset or custom
      const isPreset = AVATAR_PRESETS.some(p => p.url === user.avatar_url);
      if (user.avatar_url && !isPreset) {
        setIsCustomAvatar(true);
        setCustomAvatarInput(user.avatar_url);
      } else {
        setIsCustomAvatar(false);
      }

      // Initialize preferences
      const prefs = (user.preferences || {}) as unknown as Record<string, unknown>;
      setTone((prefs.tone as "editorial" | "technical" | "concise" | "creative") || "editorial");
      setCreativity(prefs.creativity !== undefined ? prefs.creativity as number : 0.7);
      setModel((prefs.model as string) || "gemini-3.1-pro");
      setDensity((prefs.density as "default" | "dense") || "default");
      setEmailDigest(prefs.emailDigest !== undefined ? prefs.emailDigest as boolean : true);
      setSecurityAlerts(prefs.securityAlerts !== undefined ? prefs.securityAlerts as boolean : true);
      setSystemUpdates(prefs.systemUpdates !== undefined ? prefs.systemUpdates as boolean : false);
      setInstructions((prefs.instructions as string) || "");
    }
  }, [user]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("idle");
    setErrorMessage("");

    const finalAvatarUrl = isCustomAvatar ? customAvatarInput : avatarUrl;

    const payload = {
      name,
      avatar_url: finalAvatarUrl,
      preferences: {
        tone,
        creativity,
        model,
        density,
        emailDigest,
        securityAlerts,
        systemUpdates,
        instructions
      }
    };

    try {
      const res = await apiClient("/api/v1/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }) as Response;

      if (res.ok) {
        setSaveStatus("success");
        await fetchMe();
        statusTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        const errorData = await res.json();
        setSaveStatus("error");
        setErrorMessage(errorData.detail || "Failed to update profile configurations.");
      }
    } catch {
      setSaveStatus("error");
      setErrorMessage("Network response failed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = name || user?.email?.split("@")[0] || "User";

  return (
    <div className="space-y-8 pb-16">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-display italic text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize your workspace core identity, model preferences, and automation systems.
          </p>
        </div>
        
        {/* Save button triggered by top layout for convenience */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveStatus === "success" ? (
            <Check className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4 text-accent-gold" />
          )}
          {isSaving ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Navigation Tabs and Form Controls */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Custom Tabs Navigation */}
          <div className="flex border-b border-border/40 gap-1.5 p-1 bg-muted/20 rounded-lg max-w-md">
            {[
              { id: "identity", label: "Identity", icon: User },
              { id: "engine", label: "Cognitive Engine", icon: Sliders },
              { id: "interface", label: "Interface & Alerts", icon: Bell }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-md transition-all cursor-pointer border border-transparent",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Status alerts */}
            <AnimatePresence>
              {saveStatus === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-accent-sage/10 border border-accent-sage/20 text-accent-sage text-xs rounded-lg flex items-center gap-2"
                >
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>Your system configurations and preferences have been updated successfully.</span>
                </motion.div>
              )}
              {saveStatus === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TAB 1: IDENTITY */}
            {activeTab === "identity" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-card/30 border border-border/80 rounded-xl p-5 sm:p-6 space-y-6 glass-panel">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">User Identity Profile</h2>
                      <p className="text-xs text-muted-foreground">Manage your credentials, displayed name, and avatar token.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-muted/30 border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-card/70 transition-all text-foreground"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Account Email</label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full bg-muted/40 border border-border/50 text-muted-foreground rounded-lg px-3.5 py-2.5 text-sm cursor-not-allowed opacity-80"
                      />
                      <span className="text-[10px] text-muted-foreground/60 block pl-1">Authenticated via system provider. Cannot be altered.</span>
                    </div>
                  </div>

                  {/* Avatar Section */}
                  <div className="space-y-4 pt-4 border-t border-border/40">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Profile Icon Avatar</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCustomAvatar(false)}
                          className={cn(
                            "text-[10px] px-2.5 py-1 rounded border font-medium cursor-pointer transition-colors",
                            !isCustomAvatar 
                              ? "bg-primary/10 border-primary/25 text-primary" 
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Cohesive Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCustomAvatar(true)}
                          className={cn(
                            "text-[10px] px-2.5 py-1 rounded border font-medium cursor-pointer transition-colors",
                            isCustomAvatar 
                              ? "bg-primary/10 border-primary/25 text-primary" 
                              : "border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Custom Image URL
                        </button>
                      </div>
                    </div>

                    {!isCustomAvatar ? (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {AVATAR_PRESETS.map((preset) => {
                          const isSelected = !isCustomAvatar && avatarUrl === preset.url;
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setAvatarUrl(preset.url)}
                              className={cn(
                                "aspect-square rounded-xl overflow-hidden border-2 relative transition-all group cursor-pointer",
                                isSelected 
                                  ? "border-primary scale-[1.03] shadow-md" 
                                  : "border-border/60 hover:border-muted-foreground/50"
                              )}
                              title={preset.name}
                            >
                              <img
                                src={preset.url}
                                alt={preset.name}
                                className="w-full h-full object-cover"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-3 h-3 text-primary-foreground" />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3 p-4 bg-muted/20 border border-border/80 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden border border-border/80 bg-background flex items-center justify-center flex-shrink-0">
                            {customAvatarInput ? (
                              <img
                                src={sanitizeUrl(customAvatarInput) || null}
                                alt="Custom preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to initial
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Image className="w-5 h-5 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <input
                              type="url"
                              value={customAvatarInput}
                              onChange={(e) => setCustomAvatarInput(e.target.value)}
                              placeholder="https://example.com/avatar.jpg"
                              className="w-full bg-card border border-border rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            />
                            <span className="text-[10px] text-muted-foreground/50 block">Enter an absolute URL to a public JPG, PNG, or SVG image.</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: COGNITIVE ENGINE */}
            {activeTab === "engine" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-card/30 border border-border/80 rounded-xl p-5 sm:p-6 space-y-6 glass-panel">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Sliders className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Cognitive Orchestrator Parameters</h2>
                      <p className="text-xs text-muted-foreground">Adjust LLM temperatures, assistant tone structures, and baseline prompts.</p>
                    </div>
                  </div>

                  {/* AI Tone Options */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 block">Assistant Conversational Tone</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: "editorial", label: "Editorial", desc: "Luxurious, articulate" },
                        { id: "technical", label: "Technical", desc: "Precise, code-first" },
                        { id: "concise", label: "Concise", desc: "Short, minimal" },
                        { id: "creative", label: "Creative", desc: "Original, expansive" }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTone(item.id as "editorial" | "technical" | "concise" | "creative")}
                          className={cn(
                            "flex flex-col items-start text-left p-3.5 rounded-xl border transition-all cursor-pointer",
                            tone === item.id 
                              ? "border-primary bg-primary/5 dark:bg-primary/10" 
                              : "border-border/60 bg-muted/10 hover:border-muted-foreground/40"
                          )}
                        >
                          <span className="text-xs font-semibold text-foreground">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground/70 mt-1">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/40">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 block">Core AI LLM Engine</label>
                      <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-card/70 transition-all text-foreground"
                      >
                        <option value="gemini-3.1-pro" className="bg-background">Gemini 3.1 Pro (Recommended)</option>
                        <option value="gemini-3-flash" className="bg-background">Gemini 3 Flash (Fast Inference)</option>
                      </select>
                      <span className="text-[10px] text-muted-foreground/50 block">Select the LLM variant driving your agents.</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Creativity Index (Temperature)</label>
                        <span className="text-xs font-mono text-primary font-bold">{creativity.toFixed(1)}</span>
                      </div>
                      <div className="pt-2">
                        <input
                          type="range"
                          min="0.1"
                          max="1.5"
                          step="0.1"
                          value={creativity}
                          onChange={(e) => setCreativity(parseFloat(e.target.value))}
                          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground/60 mt-1">
                          <span>Conservative (0.1)</span>
                          <span>Balanced</span>
                          <span>Creative (1.5)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom system guidelines */}
                  <div className="space-y-2 pt-4 border-t border-border/40">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Default System Prompts / Rules</label>
                      <span className="text-[10px] text-muted-foreground/60">Sustained instruction overlay</span>
                    </div>
                    <textarea
                      rows={5}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Always respond in markdown. Highlight important notes with blockquotes. Use British spelling conventions where appropriate..."
                      className="w-full bg-muted/30 border border-border rounded-lg p-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-card/70 transition-all font-mono text-foreground custom-scrollbar"
                    />
                    <span className="text-[10px] text-muted-foreground/50 block">These rules are prepended automatically to all agent instructions across chats, automations, and background workflows.</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: INTERFACE & ALERTS */}
            {activeTab === "interface" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Visual interface */}
                <div className="bg-card/30 border border-border/80 rounded-xl p-5 sm:p-6 space-y-6 glass-panel">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Visual Layout & Interface</h2>
                      <p className="text-xs text-muted-foreground">Tailor spacing densities and layout preferences.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 block">UI Spacing Density</label>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      {[
                        { id: "default", label: "Default", desc: "Balanced editorial luxury" },
                        { id: "dense", label: "Dense Mode", desc: "Maximized space utility" }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDensity(item.id as "default" | "dense")}
                          className={cn(
                            "flex flex-col items-start text-left p-3.5 rounded-xl border transition-all cursor-pointer",
                            density === item.id 
                              ? "border-primary bg-primary/5 dark:bg-primary/10" 
                              : "border-border/60 bg-muted/10 hover:border-muted-foreground/40"
                          )}
                        >
                          <span className="text-xs font-semibold text-foreground">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground/70 mt-1">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notifications & System alerts */}
                <div className="bg-card/30 border border-border/80 rounded-xl p-5 sm:p-6 space-y-6 glass-panel">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">Alerts & System Communications</h2>
                      <p className="text-xs text-muted-foreground">Adjust security levels, email summaries, and agent activity digests.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Toggle rows */}
                    {[
                      { 
                        id: "digest", 
                        state: emailDigest, 
                        setter: setEmailDigest, 
                        title: "Email Digests", 
                        desc: "Receive a compiled weekly diagnostic report of automated tasks and agent cycles directly in your mailbox." 
                      },
                      { 
                        id: "security", 
                        state: securityAlerts, 
                        setter: setSecurityAlerts, 
                        title: "Security & Access Alerts", 
                        desc: "Send rapid alerts on suspicious login sessions, database schema alterations, or key privilege updates." 
                      },
                      { 
                        id: "updates", 
                        state: systemUpdates, 
                        setter: setSystemUpdates, 
                        title: "Product & Operational Updates", 
                        desc: "Provide notifications on feature revisions, architectural upgrades, and database indexing releases." 
                      }
                    ].map(toggle => (
                      <div key={toggle.id} className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-muted/10 transition-colors">
                        <div className="space-y-0.5 max-w-lg">
                          <span className="text-sm font-semibold text-foreground block">{toggle.title}</span>
                          <span className="text-xs text-muted-foreground/70 block">{toggle.desc}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle.setter(!toggle.state)}
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-all cursor-pointer flex items-center",
                            toggle.state ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <motion.div
                            layout
                            className="w-4.5 h-4.5 rounded-full bg-card shadow-sm absolute left-1"
                            animate={{ x: toggle.state ? 20 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </form>
        </div>

        {/* Right Side: High-End Live Editorial Preview Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card/20 border border-border/80 rounded-2xl p-6 relative overflow-hidden glass-panel flex flex-col items-center justify-center min-h-[380px] lg:sticky lg:top-24">
            
            {/* Mesh background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20 dark:opacity-10 gradient-mesh" />

            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Live Preview</span>
            </div>

            {/* Micro Badge Element */}
            <motion.div
              layout
              className="w-full max-w-sm rounded-2xl bg-card border border-border/80 shadow-2xl p-6 relative z-10 transition-all flex flex-col justify-between aspect-[3/4.2] overflow-hidden"
              style={{
                background: "radial-gradient(circle at 100% 0%, hsl(var(--primary) / 0.02) 0%, transparent 80%)"
              }}
            >
              {/* Header design bar */}
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono tracking-widest text-muted-foreground/80 uppercase">Cognitive Identity</span>
                  <div className="h-0.5 w-12 bg-primary mt-1 rounded-full" />
                </div>
                <Sparkle className="w-4 h-4 text-accent-gold" />
              </div>

              {/* Central avatar representation */}
              <div className="my-auto flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-background flex items-center justify-center shadow-md">
                    <img
                      src={sanitizeUrl(isCustomAvatar ? (customAvatarInput || AVATAR_PRESETS[0].url) : avatarUrl) || null}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent-gold flex items-center justify-center text-primary-foreground border-2 border-card shadow-sm">
                    <Terminal className="w-3.5 h-3.5 text-card" />
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <h3 className="font-bold text-lg font-display tracking-tight text-foreground">{displayName}</h3>
                  <span className="text-xs text-muted-foreground/80 font-mono tracking-wider truncate block max-w-[200px]">
                    {user?.email || "anonymous@cognitive-os.io"}
                  </span>
                </div>
              </div>

              {/* Status details segment */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground/60 block">AI TONE</span>
                    <span className="text-foreground font-semibold uppercase">{tone}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground/60 block">CREATIVITY</span>
                    <span className="text-foreground font-semibold">{creativity.toFixed(1)} / 1.5</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground/60 block">MODEL</span>
                    <span className="text-foreground font-semibold truncate block">{model}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground/60 block">INTERFACE</span>
                    <span className="text-foreground font-semibold uppercase">{density}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[8px] text-muted-foreground/60 font-sans border-t border-border/30">
                  <span>COGNITIVE OS MEMBER</span>
                  <span className="font-mono">ID: {user?.id?.slice(0, 8).toUpperCase() || "PENDING"}</span>
                </div>
              </div>

            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
}
