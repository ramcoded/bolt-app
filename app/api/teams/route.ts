import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const postSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

// GET /api/teams — list all teams the current user belongs to
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('teams/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()

  const { data, error } = await admin
    .from('team_memberships')
    .select('team_id, joined_at, teams(id, name, created_by)')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  if (error) {
    logError('teams/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const teams = (data ?? []).map((row: any) => ({
    id:        row.teams?.id   ?? row.team_id,
    name:      row.teams?.name ?? 'Team',
    createdBy: row.teams?.created_by ?? null,
    joinedAt:  row.joined_at,
  }))

  return NextResponse.json({ teams })
}

// POST /api/teams — create a new team (manager only)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('teams/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    logInfo('teams/POST 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = await request.json().catch(() => null)
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const admin = getAdmin()

  // Create the team
  const { data: team, error: teamError } = await admin
    .from('teams')
    .insert({ name: result.data.name, created_by: user.id })
    .select()
    .single()

  if (teamError || !team) {
    logError('teams/POST create', teamError)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }

  // Add manager to team_memberships for the new team
  const { error: memberError } = await admin
    .from('team_memberships')
    .upsert({ user_id: user.id, team_id: team.id })

  if (memberError) {
    logError('teams/POST membership', memberError)
  }

  // If manager has no primary team yet, set this as their primary team
  if (!profile.team_id) {
    await admin.from('profiles').update({ team_id: team.id }).eq('id', user.id)
  }

  return NextResponse.json({ team: { id: team.id, name: team.name, createdBy: team.created_by } })
}
