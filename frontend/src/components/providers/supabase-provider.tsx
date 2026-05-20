'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User, Session, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface SupabaseContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: any }>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ session: Session | null; error: any }>;
  clearError: () => void;
}

const Context = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Initial Session Fetch
  useEffect(() => {
    let mounted = true

    async function initSession() {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          setRole(initialSession?.user?.user_metadata?.role ?? (initialSession?.user ? 'user' : null))
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to initialize session')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    initSession()

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          setRole(currentSession?.user?.user_metadata?.role ?? (currentSession?.user ? 'user' : null))
          setIsLoading(false)
          
          if (event === 'SIGNED_OUT') {
            setRole(null)
          }
          
          router.refresh()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // 3. Authentication Action Handlers
  const signIn = async (credentials: SignInWithPasswordCredentials) => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await supabase.auth.signInWithPassword(credentials)
      if (response.error) {
        setError(response.error.message)
      }
      return { error: response.error }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during login'
      setError(errMsg)
      return { error: { message: errMsg } }
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (credentials: SignUpWithPasswordCredentials) => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await supabase.auth.signUp(credentials)
      if (response.error) {
        setError(response.error.message)
      }
      return { error: response.error }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during signup'
      setError(errMsg)
      return { error: { message: errMsg } }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setRole(null)
      router.push('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSession = async () => {
    setError(null)
    try {
      const response = await supabase.auth.refreshSession()
      if (response.error) {
        setError(response.error.message)
      } else {
        setSession(response.data.session)
        setUser(response.data.session?.user ?? null)
        setRole(response.data.session?.user?.user_metadata?.role ?? (response.data.session?.user ? 'user' : null))
      }
      return { session: response.data.session, error: response.error }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to refresh session'
      setError(errMsg)
      return { session: null, error: { message: errMsg } }
    }
  }

  const clearError = () => setError(null)

  return (
    <Context.Provider value={{ 
      user, 
      session, 
      role, 
      isAuthenticated: !!user, 
      isLoading, 
      error, 
      signIn, 
      signUp, 
      signOut, 
      refreshSession,
      clearError 
    }}>
      {children}
    </Context.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useAuth must be used inside a SupabaseProvider')
  }
  return context
}
