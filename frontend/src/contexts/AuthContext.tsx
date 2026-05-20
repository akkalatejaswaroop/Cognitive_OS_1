'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User, Session, SignInWithPasswordCredentials, SignUpWithPasswordCredentials, AuthError } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

/**
 * Enhanced User type that includes role-based information
 */
export interface AuthUser extends User {
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth methods
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: AuthError | null }>;
  signUp: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ session: Session | null; error: AuthError | null }>;
  
  // Utilities
  clearError: () => void;
  hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Helper to format Supabase user to our AuthUser type
   */
  const formatUser = useCallback((supabaseUser: User | null): AuthUser | null => {
    if (!supabaseUser) return null;
    
    return {
      ...supabaseUser,
      role: supabaseUser.user_metadata?.role || 'user'
    } as AuthUser;
  }, []);

  /**
   * Initialize session and set up refresh timers
   */
  useEffect(() => {
    let mounted = true
    let refreshTimer: NodeJS.Timeout

    async function initSession() {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError

        if (mounted) {
          setSession(initialSession)
          setUser(formatUser(initialSession?.user ?? null))
          
          // Setup background refresh if session exists
          if (initialSession) {
            setupRefreshTimer(initialSession)
          }
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

    function setupRefreshTimer(currentSession: Session) {
      if (refreshTimer) clearTimeout(refreshTimer)
      
      // Refresh 5 minutes before expiry
      const expiresAt = currentSession.expires_at! * 1000
      const timeout = expiresAt - Date.now() - (5 * 60 * 1000)
      
      if (timeout > 0) {
        refreshTimer = setTimeout(async () => {
          const { session: newSession } = await refreshSession()
          if (newSession && mounted) {
            setupRefreshTimer(newSession)
          }
        }, timeout)
      }
    }

    initSession()

    /**
     * Listen for auth state changes
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (mounted) {
          setSession(currentSession)
          setUser(formatUser(currentSession?.user ?? null))
          setIsLoading(false)
          
          if (currentSession) {
            setupRefreshTimer(currentSession)
          }

          if (event === 'SIGNED_IN') {
            router.refresh()
          }
          
          if (event === 'SIGNED_OUT') {
            if (refreshTimer) clearTimeout(refreshTimer)
            router.push('/login')
            router.refresh()
          }
        }
      }
    )

    return () => {
      mounted = false
      if (refreshTimer) clearTimeout(refreshTimer)
      subscription.unsubscribe()
    }
  }, [supabase, router, formatUser])

  /**
   * Sign in with email and password
   */
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
      return { error: { message: errMsg } as AuthError }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign up with email and password
   */
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
      return { error: { message: errMsg } as AuthError }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign out current session
   */
  const signOut = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      
      setUser(null)
      setSession(null)
      router.push('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Manually refresh the session
   */
  const refreshSession = async () => {
    setError(null)
    try {
      const response = await supabase.auth.refreshSession()
      if (response.error) {
        setError(response.error.message)
      } else {
        setSession(response.data.session)
        setUser(formatUser(response.data.session?.user ?? null))
      }
      return { session: response.data.session, error: response.error }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to refresh session'
      setError(errMsg)
      return { session: null, error: { message: errMsg } as AuthError }
    }
  }

  /**
   * Check if user has a specific role or any of the roles in a list
   */
  const hasRole = (roleOrRoles: string | string[]) => {
    if (!user) return false;
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return roles.includes(user.role);
  }

  const clearError = () => setError(null)

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
    clearError,
    hasRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook to consume the AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return context
}
