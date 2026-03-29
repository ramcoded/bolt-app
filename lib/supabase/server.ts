import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => {
            // Strip maxAge/expires so auth cookies are session-only.
            // This prevents auto-login after the browser is closed and reopened.
            const { maxAge, expires, ...sessionOptions } = options ?? {}
            cookieStore.set(name, value, sessionOptions)
          }),
      },
    }
  )
}
