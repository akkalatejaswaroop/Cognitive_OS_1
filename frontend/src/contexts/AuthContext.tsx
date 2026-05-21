'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { auth } from '@/utils/firebase/config'
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  onIdTokenChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { useRouter } from 'next/navigation'

/**
 * Enhanced User type that includes role-based information
 */
export interface AuthUser extends FirebaseUser {
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  
  // Utilities
  clearError: () => void;
  hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Helper to format Firebase user to our AuthUser type
   */
  const formatUser = useCallback((firebaseUser: FirebaseUser | null): AuthUser | null => {
    if (!firebaseUser) return null;
    
    // In a real app, you would fetch custom claims or role from Firestore/Backend
    return {
      ...firebaseUser,
      role: 'user'
    } as AuthUser;
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (mounted) {
        // Sync token with backend if necessary by calling your API
        if (currentUser) {
          const token = await currentUser.getIdToken();
          // You can set cookie here or let the frontend pass the token in headers
          document.cookie = `access_token=Bearer ${token}; path=/; max-age=3600; SameSite=Lax`;
          setUser(formatUser(currentUser));
        } else {
          document.cookie = `access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          setUser(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    }
  }, [formatUser]);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: any, password: any) => {
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
  const signUp = async (email: any, password: any) => {
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
   * Sign out current session
   */
  const signOut = async () => {
    setError(null)
    setIsLoading(true)
    try {
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
    if (!user) return false;
    const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
    return roles.includes(user.role);
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
