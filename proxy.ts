import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Use the pattern recommended by Supabase SSR: forward refreshed cookies to
  // the request so downstream Server Components receive a fresh token without
  // attempting another refresh (which would throw in Server Component context).
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Write refreshed cookies into the request so server components see them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Strip maxAge/expires so auth cookies are session-only.
            // This prevents auto-login after the browser is closed and reopened.
            const { maxAge, expires, ...sessionOptions } = options ?? {}
            supabaseResponse.cookies.set(name, value, sessionOptions)
          })
        },
      },
    }
  )

  // Refresh the session if expired — must happen before any Server Component reads auth
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Redirect unauthenticated users to login
  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/set-password') &&
    !pathname.startsWith('/auth/callback') &&
    !pathname.startsWith('/auth/popup-complete')
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from login
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const dest = profile?.role === 'manager' ? '/manager/dashboard' : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // Block employees from manager routes
  if (user && pathname.startsWith('/manager')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
