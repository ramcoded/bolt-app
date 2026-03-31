import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logError, logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getManagerTeam(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', userId)
    .single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/members/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const me = await getManagerTeam(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/members/GET 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!me.team_id) return NextResponse.json({ members: [] })

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, avatar, role, department, online, last_seen')
    .eq('team_id', me.team_id)
    .order('name', { ascending: true })

  if (error) {
    logError('manager/members/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Fetch auth users to determine invite status — only for this team's profiles
  const admin = getAdmin()
  const profileIds = (profiles ?? []).map((p) => p.id)
  const authResults = await Promise.all(
    profileIds.map((id) => admin.auth.admin.getUserById(id).then((r) => r.data.user).catch(() => null))
  )
  const authMap = new Map<string, { last_sign_in_at: string | null }>(
    authResults
      .filter((u): u is NonNullable<typeof u> => u !== null)
      .map((u) => [u.id, { last_sign_in_at: u.last_sign_in_at ?? null }])
  )

  const members = (profiles ?? []).map((m) => {
    const authUser = authMap.get(m.id)
    const status: 'pending' | 'joined' = authUser?.last_sign_in_at ? 'joined' : 'pending'
    return { ...m, status }
  })

  return NextResponse.json({ members })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/members/DELETE 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const me = await getManagerTeam(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/members/DELETE 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })

  // Ensure target is in the same team
  if (me.team_id) {
    const { data: target } = await supabase.from('profiles').select('team_id').eq('id', id).single()
    if (target?.team_id !== me.team_id) {
      logInfo('manager/members/DELETE 403', 'Forbidden: target not in same team')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const admin = getAdmin()

  // Delete profile first, then auth user
  await admin.from('profiles').delete().eq('id', id)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    logError('manager/members/DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  logInfo('manager/members/DELETE audit', `Manager ${user.id} deleted user ${id}`)
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/members/PATCH 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const me = await getManagerTeam(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/members/PATCH 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, role, department } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  if (role === undefined && department === undefined) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  if (role !== undefined && !['manager', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (role !== undefined && id === user.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
  }

  // Ensure target is in the same team
  if (me.team_id) {
    const { data: target } = await supabase.from('profiles').select('team_id').eq('id', id).single()
    if (target?.team_id !== me.team_id) {
      logInfo('manager/members/PATCH 403', 'Forbidden: target not in same team')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const admin = getAdmin()
  const updates: Record<string, unknown> = {}
  if (role !== undefined)       updates.role       = role
  if (department !== undefined) updates.department = department || null

  const { error } = await admin.from('profiles').update(updates).eq('id', id)
  if (error) {
    logError('manager/members/PATCH', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  logInfo('manager/members/PATCH audit', `Manager ${user.id} updated user ${id}: ${JSON.stringify(updates)}`)
  return NextResponse.json({ success: true })
}
