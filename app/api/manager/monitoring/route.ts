import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/monitoring/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (me?.role !== 'manager') {
    logInfo('manager/monitoring/GET 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
    : supabase

  const { searchParams } = new URL(request.url)
  const requestedTeamId = searchParams.get('teamId')

  let teamId: string | null = null
  if (requestedTeamId) {
    const { data: membership } = await db
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('team_id', requestedTeamId)
      .maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    teamId = requestedTeamId
  } else {
    teamId = me.team_id
  }

  if (!teamId) return NextResponse.json({ members: [] })

  const { data: memberships } = await db
    .from('team_memberships')
    .select('user_id')
    .eq('team_id', teamId)

  const memberIds = (memberships ?? []).map((m: any) => m.user_id).filter((id: string) => id !== user.id)
  if (memberIds.length === 0) return NextResponse.json({ members: [] })

  const { data: profiles } = await db
    .from('profiles')
    .select('id, name, avatar, department, online, last_seen')
    .in('id', memberIds)
    .order('name', { ascending: true })

  const today = new Date().toISOString().slice(0, 10)

  const { data: records } = await db
    .from('time_records')
    .select('id, user_id, time_in, time_out, duration')
    .eq('date', today)
    .in('user_id', memberIds.length > 0 ? memberIds : [''])
    .order('time_in', { ascending: false }) // newest first

  const members = (profiles ?? []).map((p) => {
    const userRecords = (records ?? []).filter((r) => r.user_id === p.id)
    // Prefer the active record (still clocked in), otherwise most recent completed
    const record = userRecords.find((r) => r.time_out === null) ?? userRecords[0] ?? null
    const isClockedIn = record ? record.time_out === null : false

    return {
      id:           p.id,
      name:         p.name,
      avatar:       p.avatar ?? p.name?.slice(0, 2).toUpperCase() ?? '??',
      department:   p.department ?? null,
      online:       p.online ?? false,
      lastSeen:     p.last_seen ?? null,
      isClockedIn,
      timeIn:       record?.time_in   ?? null,
      timeOut:      record?.time_out  ?? null,
      durationMins: record?.duration  ?? null,
    }
  })

  return NextResponse.json({ members })
}
