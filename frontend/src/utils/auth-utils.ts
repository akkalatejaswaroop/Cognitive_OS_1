/**
 * Auth utility helpers — no external dependencies.
 */

/**
 * Checks if a JWT access token stored in a cookie is expired.
 */
export const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true
  try {
    const clean = token.replace('Bearer ', '')
    const [, payloadB64] = clean.split('.')
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    const now = Math.floor(Date.now() / 1000)
    return (payload.exp ?? 0) - now < 60
  } catch {
    return true
  }
}

/**
 * Formats auth errors for display.
 */
export const formatAuthError = (error: unknown): string => {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'An unexpected authentication error occurred'
}
