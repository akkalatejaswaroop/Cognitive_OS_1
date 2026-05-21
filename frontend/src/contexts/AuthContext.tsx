'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { auth } from '@/utils/firebase/config'
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
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
          const secure = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `access_token=Bearer ${token}; path=/; max-age=3600; SameSite=Lax${secure}`;
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
  const mapFirebaseError = (err: { code?: string } | null): string => {
    const code = err?.code || ''
    if (code.includes('auth/user-not-found') || code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
      return 'Invalid email or password.'
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists.'
    }
    if (code.includes('auth/weak-password')) {
      return 'Password is too weak. Use at least 6 characters.'
    }
    if (code.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.'
    }
    if (code.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please try again later.'
    }
    if (code.includes('auth/user-disabled')) {
      return 'This account has been disabled.'
    }
    if (code.includes('auth/popup-closed-by-user')) {
      return 'Sign in was cancelled.'
    }
    return 'An unexpected error occurred. Please try again.'
  }

  const signIn = async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err: unknown) {
      const errMsg = mapFirebaseError(err as { code?: string })
      setError(errMsg)
      return { error: new Error(errMsg) }
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      return { error: null }
    } catch (err: unknown) {
      const errMsg = mapFirebaseError(err as { code?: string })
      setError(errMsg)
      return { error: new Error(errMsg) }
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      return { error: null }
    } catch (err: unknown) {
      const errMsg = mapFirebaseError(err as { code?: string })
      setError(errMsg)
      return { error: new Error(errMsg) }
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await firebaseSignOut(auth)
      setUser(null)
      router.push('/login')
    } catch {
      setError('Failed to sign out.')
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
