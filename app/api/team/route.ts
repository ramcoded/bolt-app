import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logError, logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function mapMember(m: any) {
  return {
    id:       m.id,
    name:     m.name,
    role:     m.role,
    avatar:   m.avatar ?? m.name?.slice(0, 2).toUpperCase() ?? '??',
    online:   m.online ?? false,
    lastSeen: m.last_seen ?? undefined,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('team/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key if available (bypasses RLS so offline members are visible too)
  const db = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : supabase

  // Get current user's team
  const { data: me } = await db
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (!me?.team_id) return NextResponse.json([])

  const { data, error } = await db
    .from('profiles')
    .select('id, name, role, avatar, online, last_seen')
    .neq('id', user.id)
    .eq('team_id', me.team_id)
    .order('name', { ascending: true })
    .limit(100)

  if (error) {
    logError('team/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json((data ?? []).map(mapMember))
}
