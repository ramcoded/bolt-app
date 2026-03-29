import { createBrowserClient } from '@supabase/ssr'

// Singleton — all components share the same client instance to prevent
// concurrent auth token lock contention (LockAcquireTimeoutError).
let _client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return document.cookie.split(';').flatMap(c => {
              const eq = c.indexOf('=')
              if (eq < 0) return []
              return [{ name: c.slice(0, eq).trim(), value: c.slice(eq + 1).trim() }]
            })
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options = {} }) => {
              // Omit maxAge/expires — session-only cookies are cleared on browser close,
              // preventing auto-login on the next browser session.
              const { maxAge, expires, path = '/', domain, secure, sameSite } = options as any
              let cookie = `${name}=${value}; path=${path}`
              if (domain) cookie += `; domain=${domain}`
              if (secure) cookie += `; secure`
              if (sameSite) cookie += `; samesite=${sameSite}`
              document.cookie = cookie
            })
          },
        },
      }
    )
  }
  return _client
}
