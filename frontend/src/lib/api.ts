import { auth } from '@/utils/firebase/config'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_ENDPOINT || 'http://localhost:8000'

let isRefreshing = false
let refreshSubscribers: (() => void)[] = []

function subscribeTokenRefresh(cb: () => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed() {
  refreshSubscribers.forEach((cb) => cb())
  refreshSubscribers = []
}

/**
 * Attempt to refresh the session.
 * 
 * Strategy:
 * 1. If the user is signed in via Firebase, force-refresh the Firebase ID token
 *    and re-sync with the backend to get fresh httpOnly cookies.
 * 2. Otherwise fall back to the backend /auth/refresh cookie-based endpoint.
 * 
 * Returns true if refresh succeeded, false if the user must log in again.
 */
async function refreshSession(): Promise<boolean> {
  // Try Firebase-first refresh
  const currentUser = auth.currentUser
  if (currentUser) {
    try {
      const freshToken = await currentUser.getIdToken(/* forceRefresh */ true)
      const res = await fetch(`${apiBaseUrl}/api/v1/auth/firebase-sync`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: freshToken }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  // Fallback: cookie-based refresh (for email/password sessions)
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function apiClient(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${apiBaseUrl}${endpoint}`

  const defaultOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  let response = await fetch(url, defaultOptions)

  // If 401 Unauthorized, try to refresh the session once
  if (
    response.status === 401 &&
    !url.includes('/auth/login') &&
    !url.includes('/auth/refresh') &&
    !url.includes('/auth/firebase-sync')
  ) {
    if (!isRefreshing) {
      isRefreshing = true
      const refreshed = await refreshSession()
      isRefreshing = false

      if (refreshed) {
        onRefreshed()
        // Retry original request with fresh cookies
        return fetch(url, defaultOptions)
      } else {
        // Session is truly dead — redirect to login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
        return response
      }
    } else {
      // Another request is already refreshing — queue this one
      return new Promise((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(fetch(url, defaultOptions))
        })
      })
    }
  }

  return response
}
