import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export interface AuthUser {
  id: string
  email?: string
  role?: string
}

/**
 * Gets the current authenticated session user by decoding the JWT cookie.
 */
export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const tokenStr = cookieStore.get('access_token')?.value
    
    if (!tokenStr) {
      // MVP Bypass: Return a mock user if no session cookie exists
      return {
        id: 'mvp-user-id',
        email: 'mvp@cognitive.os',
        role: 'admin'
      }
    }
    
    // token format is typically "Bearer eyJhbGci..."
    const token = tokenStr.replace('Bearer ', '')
    const base64Url = token.split('.')[1]
    if (!base64Url) {
      return {
        id: 'mvp-user-id',
        email: 'mvp@cognitive.os',
        role: 'admin'
      }
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
    
    return {
      id: payload.user_id || payload.sub,
      email: payload.email,
      role: payload.role || 'user'
    }
  } catch {
    // MVP Bypass fallback
    return {
      id: 'mvp-user-id',
      email: 'mvp@cognitive.os',
      role: 'admin'
    }
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
