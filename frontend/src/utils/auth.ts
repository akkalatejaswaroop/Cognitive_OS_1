import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export interface AuthUser {
  id: string
  email?: string
  role?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies()
    const tokenStr = cookieStore.get('access_token')?.value
    if (!tokenStr) return null

    const token = tokenStr.replace('Bearer ', '')
    const payload = decodeTokenPayload(token)
    if (!payload) return null

    return {
      id: (payload.user_id as string) || (payload.sub as string),
      email: payload.email as string | undefined,
      role: (payload.role as string) || 'user',
    }
  } catch {
    return null
  }
}

export async function requireAuth(options: { allowedRoles?: string[] } = {}) {
  const cookieStore = await cookies()
  const tokenStr = cookieStore.get('access_token')?.value

  if (!tokenStr) {
    redirect('/login?error=Session expired.')
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { Cookie: `access_token=${tokenStr}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      redirect('/login?error=Session expired.')
    }

    const data = await res.json()
    const user: AuthUser = {
      id: data.id,
      email: data.email,
      role: data.role || 'user',
    }

    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(user.role!)) {
        redirect('/dashboard?error=Access denied.')
      }
    }

    return user
  } catch {
    redirect('/login?error=Session expired.')
  }
}
