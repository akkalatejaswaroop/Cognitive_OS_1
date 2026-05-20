import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'

export interface AuthUser {
  id: string
  email?: string
  role?: string
}

/**
 * Gets the current authenticated session user and extracts metadata claims.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) return null

    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user'
    }
  } catch {
    return null
  }
}

/**
 * Server-side route guard. Redirects if unauthorized or if role checks fail.
 */
export async function requireAuth(options: { allowedRoles?: string[] } = {}) {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login?error=Session expired. Please log in again.')
  }

  if (options.allowedRoles && options.allowedRoles.length > 0) {
    const userRole = user.role || 'user'
    if (!options.allowedRoles.includes(userRole)) {
      redirect('/dashboard?error=Access denied. Unauthorized role level.')
    }
  }

  return user
}
