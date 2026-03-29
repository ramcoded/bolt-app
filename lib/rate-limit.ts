import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Database-backed rate limiter — works correctly on Vercel serverless
// (in-memory Maps reset on every cold start and are not shared between instances).

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const admin = getAdmin()
    const windowStart = new Date(Date.now() - windowMs).toISOString()

    const { count } = await admin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart)

    if ((count ?? 0) >= limit) return false

    await admin.from('rate_limits').insert({ key })

    // Prune stale rows (fire-and-forget — doesn't block the response)
    admin
      .from('rate_limits')
      .delete()
      .lt('created_at', new Date(Date.now() - windowMs * 2).toISOString())
      .then(() => {})

    return true
  } catch {
    // Fail open — don't block requests if the rate limit store is temporarily unavailable
    return true
  }
}
