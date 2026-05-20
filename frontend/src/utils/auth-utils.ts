import { Session } from '@supabase/supabase-js'

/**
 * Checks if a session is currently expired or about to expire in the next 60 seconds.
 */
export const isSessionExpired = (session: Session | null): boolean => {
  if (!session || !session.expires_at) return true
  
  // expires_at is in seconds
  const expiresAt = session.expires_at
  const now = Math.floor(Date.now() / 1000)
  
  // Return true if expired or expiring in less than 60 seconds
  return (expiresAt - now) < 60
}

/**
 * Gets the access token from the session.
 */
export const getAccessToken = (session: Session | null): string | null => {
  return session?.access_token || null
}

/**
 * Gets the user ID from the session.
 */
export const getUserId = (session: Session | null): string | null => {
  return session?.user?.id || null
}

/**
 * Gets the user role from the session metadata.
 */
export const getUserRole = (session: Session | null): string => {
  return session?.user?.user_metadata?.role || 'user'
}

/**
 * Formats auth errors for display.
 */
export const formatAuthError = (error: any): string => {
  if (!error) return ''
  if (typeof error === 'string') return error
  return error.message || 'An unexpected authentication error occurred'
}
