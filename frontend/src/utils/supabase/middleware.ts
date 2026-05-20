import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 1. Define Routes Types
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password')
  
  const protectedPaths = ['/dashboard', '/memory', '/agents', '/analytics', '/settings']
  const isProtectedRoute = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 2. Auth Page Guard (Redirect to /dashboard if logged in)
  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // 3. Protected Route Guard (Redirect to /login if anonymous)
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'Authentication required')
    return NextResponse.redirect(redirectUrl)
  }

  // 4. Role-based Route Guards (Example: Premium analytical modules)
  if (user && pathname.startsWith('/dashboard/analytics')) {
    const userRole = user.user_metadata?.role || 'user'
    // Let's allow access for standard role and premium. Block guest/unregistered.
    if (userRole === 'guest') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      redirectUrl.searchParams.set('error', 'Upgrade plan to access analytics logs')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}
