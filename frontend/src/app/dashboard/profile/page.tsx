'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  User, Camera, Mail, Globe, Clock, Bell, 
  Shield, Sliders, Cpu, Save, Loader2, 
  CheckCircle, AlertCircle, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api'
import { UserProfile, UserUpdatePayload } from '@/lib/types'
import { cn } from '@/lib/utils'

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  name: z.string().min(2, "Display name must be at least 2 characters"),
  phone_number: z.string().optional(),
  dob: z.string().optional(),
  company: z.string().optional(),
  role_title: z.string().optional(),
  public_profile_url: z.string().regex(/^[a-zA-Z0-9_-]*$/, "Only letters, numbers, dashes, and underscores").optional(),
  social_profiles: z.object({
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
  }).optional(),
  interests_str: z.string().optional(),
  hobbies_str: z.string().optional(),
  timezone: z.string(),
  cognitive_preferences: z.object({
    default_model: z.string(),
    temperature: z.number().min(0).max(2),
    agent_verbosity: z.enum(['minimal', 'medium', 'verbose']),
    voice_enabled: z.boolean(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    density: z.enum(['default', 'dense']),
    notifications: z.object({
      email_digests: z.boolean(),
      security_alerts: z.boolean(),
      system_updates: z.boolean(),
      in_app_notifications: z.boolean(),
    }),
  }),
})

type ProfileFormValues = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'cognitive' | 'preferences'>('profile')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const isOnboarding = user && !user.onboarding_completed
  const fileInputRef = useRef<HTMLInputElement>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    if (user) {
      // Derive display name from email if name is missing
      const derivedName = user.name || user.email?.split('@')[0] || '';
      
      reset({
        full_name: user.full_name || '',
        name: derivedName,
        phone_number: user.phone_number || '',
        dob: user.dob ? user.dob.split('T')[0] : '',
        company: user.company || '',
        role_title: user.role_title || '',
        public_profile_url: user.public_profile_url || '',
        social_profiles: {
          instagram: user.social_profiles?.instagram || '',
          linkedin: user.social_profiles?.linkedin || '',
        },
        interests_str: user.interests?.join(', ') || '',
        hobbies_str: user.hobbies?.join(', ') || '',
        timezone: user.timezone || 'UTC',
        cognitive_preferences: user.cognitive_preferences || {
          default_model: 'llama3.2',
          temperature: 0.7,
          agent_verbosity: 'medium',
          voice_enabled: false
        },
        preferences: user.preferences || {
          theme: 'system',
          density: 'default',
          notifications: {
            email_digests: true,
            security_alerts: true,
            system_updates: true,
            in_app_notifications: true
          }
        },
      })
    }
  }, [user, reset])

  const isSocialLogin = user?.app_metadata?.provider === 'google' || user?.app_metadata?.provider === 'github'

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSaving(true)
    setFeedback(null)
    
    try {
      const interests = data.interests_str ? data.interests_str.split(',').map(s => s.trim()).filter(Boolean) : []
      const hobbies = data.hobbies_str ? data.hobbies_str.split(',').map(s => s.trim()).filter(Boolean) : []
      
      const payload: Record<string, unknown> = {
        ...data,
        interests,
        hobbies,
        onboarding_completed: true // saving profile marks onboarding as complete
      }
      delete payload.interests_str
      delete payload.hobbies_str

      const res = await apiClient('/api/v1/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      if (!(res as Response).ok) throw new Error('Failed to update profile')
      
      await fetchMe()
      setFeedback({ type: 'success', message: 'Profile updated successfully' })
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), 3000)
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: (err as Error).message || 'An error occurred' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'}/api/v1/auth/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Required to send auth cookie
      })

      if (!res.ok) throw new Error('Failed to upload avatar')
      
      await fetchMe()
      setFeedback({ type: 'success', message: 'Avatar updated' })
    } catch {
      setFeedback({ type: 'error', message: 'Failed to upload avatar' })
    } finally {
      setIsUploading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card/50 backdrop-blur-xl border border-border p-8 rounded-3xl shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-background shadow-lg bg-muted flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || ''} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{user.full_name || user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/20">
                {user.role}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSaving || (!isDirty && !isOnboarding)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isOnboarding ? 'Complete Profile & Continue' : 'Save Changes'}
        </button>
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "p-4 rounded-xl border flex items-center gap-3",
              feedback.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-destructive/10 border-destructive/20 text-destructive"
            )}
          >
            {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          {[
            { id: 'profile', label: 'Identity & Access', icon: User },
            { id: 'cognitive', label: 'Cognitive Engine', icon: Cpu },
            { id: 'preferences', label: 'Interface & Alerts', icon: Sliders },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'profile' | 'cognitive' | 'preferences')}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left",
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Form Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border rounded-3xl p-8 shadow-sm"
          >
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Shield className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Identity Details</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Full Legal Name *</label>
                    <input 
                      {...register('full_name')}
                      disabled={isSocialLogin}
                      className={cn(
                        "w-full border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                        isSocialLogin ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-muted/50"
                      )}
                    />
                    {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Display Pseudonym *</label>
                    <input 
                      {...register('name')}
                      disabled={isSocialLogin}
                      className={cn(
                        "w-full border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all",
                        isSocialLogin ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-muted/50"
                      )}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5" />
                      Public Profile Alias
                    </label>
                    <div className="flex bg-muted/50 border border-border rounded-xl focus-within:ring-2 focus-within:ring-primary/20 transition-all overflow-hidden">
                      <span className="bg-muted px-3 py-3 text-sm text-muted-foreground border-r border-border">/u/</span>
                      <input 
                        {...register('public_profile_url')}
                        placeholder="username"
                        className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                      />
                    </div>
                    {errors.public_profile_url && <p className="text-xs text-destructive">{errors.public_profile_url.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" />
                      Recovery Email
                    </label>
                    <input 
                      value={user.email} 
                      disabled 
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Phone Number</label>
                    <input 
                      {...register('phone_number')}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Date of Birth</label>
                    <input 
                      type="date"
                      {...register('dob')}
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Company</label>
                    <input 
                      {...register('company')}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Working Role</label>
                    <input 
                      {...register('role_title')}
                      placeholder="e.g. Senior Designer"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Instagram URL</label>
                    <input 
                      {...register('social_profiles.instagram')}
                      placeholder="https://instagram.com/username"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">LinkedIn URL</label>
                    <input 
                      {...register('social_profiles.linkedin')}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Interests (comma separated)</label>
                    <input 
                      {...register('interests_str')}
                      placeholder="e.g. Design, AI, Architecture"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Hobbies (comma separated)</label>
                    <input 
                      {...register('hobbies_str')}
                      placeholder="e.g. Photography, Reading, Hiking"
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5" />
                      Timezone Context
                    </label>
                    <select 
                      {...register('timezone')}
                      className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      {['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'].map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cognitive' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Cognitive Parameters</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Default Neural Model</label>
                    <div className="space-y-2">
                      {['llama3.2', 'gemini-1.5-pro', 'gpt-4o'].map(model => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => setValue('cognitive_preferences.default_model', model, { shouldDirty: true })}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                            watch('cognitive_preferences.default_model') === model 
                              ? "bg-primary/5 border-primary text-primary font-semibold" 
                              : "bg-muted/30 border-border hover:border-muted-foreground/50"
                          )}
                        >
                          <span className="text-sm">{model}</span>
                          {watch('cognitive_preferences.default_model') === model && <CheckCircle className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Inference Temperature</label>
                        <span className="text-sm font-mono font-bold text-primary">{watch('cognitive_preferences.temperature')}</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.1"
                        value={watch('cognitive_preferences.temperature')}
                        onChange={(e) => setValue('cognitive_preferences.temperature', parseFloat(e.target.value), { shouldDirty: true })}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>PRECISE</span>
                        <span>CREATIVE</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="space-y-1">
                          <span className="text-sm font-bold">Neural Voice Output</span>
                          <p className="text-xs text-muted-foreground">Enable text-to-speech for agent responses</p>
                        </div>
                        <div 
                          onClick={() => setValue('cognitive_preferences.voice_enabled', !watch('cognitive_preferences.voice_enabled'), { shouldDirty: true })}
                          className={cn(
                            "w-12 h-6 rounded-full p-1 transition-colors relative",
                            watch('cognitive_preferences.voice_enabled') ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <motion.div 
                            animate={{ x: watch('cognitive_preferences.voice_enabled') ? 24 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-sm" 
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
                    <Sliders className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Interface & Environment</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Visual Theme</label>
                      <div className="flex gap-2">
                        {['light', 'dark', 'system'].map(theme => (
                          <button
                            key={theme}
                            type="button"
                            onClick={() => setValue('preferences.theme', theme as 'light' | 'dark' | 'system', { shouldDirty: true })}
                            className={cn(
                              "flex-1 py-3 rounded-xl border text-sm font-medium transition-all capitalize",
                              watch('preferences.theme') === theme 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10" 
                                : "bg-muted/30 border-border hover:border-muted-foreground/50"
                            )}
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">UI Density</label>
                      <div className="flex gap-2">
                        {['default', 'dense'].map(density => (
                          <button
                            key={density}
                            type="button"
                            onClick={() => setValue('preferences.density', density as 'default' | 'dense', { shouldDirty: true })}
                            className={cn(
                              "flex-1 py-3 rounded-xl border text-sm font-medium transition-all capitalize",
                              watch('preferences.density') === density 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10" 
                                : "bg-muted/30 border-border hover:border-muted-foreground/50"
                            )}
                          >
                            {density}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
                    <Bell className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Notification Protocols</h2>
                  </div>

                  <div className="space-y-4">
                    {[
                      { key: 'preferences.notifications.email_digests', title: 'Neural Context Digests', desc: 'Weekly analytical summary of agent activities via email' },
                      { key: 'preferences.notifications.security_alerts', title: 'Security Heartbeat', desc: 'Immediate alerts for access patterns and model anomalies' },
                      { key: 'preferences.notifications.system_updates', title: 'Kernel Updates', desc: 'Information about new OS features and architectural improvements' },
                      { key: 'preferences.notifications.in_app_notifications', title: 'Direct Interface Alerts', desc: 'Real-time pings for agent completions and memory associations' },
                    ].map(item => {
                      const notifKey = item.key as 'preferences.notifications.email_digests' | 'preferences.notifications.security_alerts' | 'preferences.notifications.system_updates' | 'preferences.notifications.in_app_notifications';
                      return (
                      <label key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="space-y-1">
                          <span className="text-sm font-bold">{item.title}</span>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <div 
                          onClick={() => {
                            const current = watch(notifKey)
                            setValue(notifKey, !current, { shouldDirty: true })
                          }}
                          className={cn(
                            "w-12 h-6 rounded-full p-1 transition-colors relative",
                            watch(notifKey) ? "bg-primary" : "bg-muted"
                          )}
                        >
                          <motion.div 
                            animate={{ x: watch(notifKey) ? 24 : 0 }}
                            className="w-4 h-4 bg-white rounded-full shadow-sm" 
                          />
                        </div>
                      </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
