'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { auth } from '@/utils/firebase/config'
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { useRouter } from 'next/navigation'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'

/**
 * Enhanced User type that includes role-based information
 */
export interface AuthUser extends FirebaseUser {
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>

  // Utilities
  clearError: () => void
  hasRole: (role: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Exchange a Firebase ID token for backend httpOnly session cookies.
 * The backend verifies the Firebase token and sets access_token + refresh_token cookies.
 * This avoids writing tokens via document.cookie which would conflict with httpOnly cookies.
 */
async function syncTokenWithBackend(firebaseUser: FirebaseUser, forceRefresh = false): Promise<void> {
  try {
    const idToken = await firebaseUser.getIdToken(forceRefresh)
    await fetch(`${apiBaseUrl}/api/v1/auth/firebase-sync`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    })
  } catch {
    // Non-fatal — backend already supports validating Firebase tokens directly
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Helper to format Firebase user to our AuthUser type
   */
  const formatUser = useCallback((firebaseUser: FirebaseUser | null): AuthUser | null => {
    if (!firebaseUser) return null
    return { ...firebaseUser, role: 'user' } as AuthUser
  }, [])

  useEffect(() => {
    // MVP Bypass: Set a mock user immediately
    const mockUser: AuthUser = {
      uid: 'mvp-user-id',
      email: 'mvp@cognitive.os',
      displayName: 'MVP Explorer',
      role: 'admin',
      emailVerified: true,
      isAnonymous: false,
      metadata: {},
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => 'mvp-token',
      getIdTokenResult: async () => ({} as any),
      reload: async () => {},
      toJSON: () => ({}),
      phoneNumber: null,
      photoURL: null,
    } as any

    setUser(mockUser)
    setIsLoading(false)

    /*
    let mounted = true
    let refreshInterval: ReturnType<typeof setInterval> | null = null
    ...
    */
  }, [])

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during login'
      setError(errMsg)
      return { error: new Error(errMsg) }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err: any) {
      const errMsg = err.message || 'An unexpected error occurred during signup'
      setError(errMsg)
      return { error: new Error(errMsg) }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      return { error: null }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to sign in with Google'
      setError(errMsg)
      return { error: new Error(errMsg) }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Sign out current session — clears both Firebase session and backend httpOnly cookies.
   */
  const signOut = async () => {
    setError(null)
    setIsLoading(true)
    try {
      // Ask backend to clear httpOnly cookies first
      await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {})

      await firebaseSignOut(auth)
      setUser(null)
      router.push('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to sign out')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check if user has a specific role or any of the roles in a list
   */
  const hasRole = (roleOrRoles: string | string[]) => {
    if (!user) return false
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles]
    return roles.includes(user.role)
  }

  const clearError = () => setError(null)

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    clearError,
    hasRole,
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
