import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const postSchema = z.object({
  email:      z.string().email(),
  name:       z.string().min(1).max(200),
  role:       z.enum(['manager', 'member']),
  department: z.string().max(200).nullable().optional(),
  teamId:     z.string().uuid().optional(), // override team for multi-team managers
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/invite/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'manager') {
    logInfo('manager/invite/POST 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit: 10 invites per hour per manager
  if (!await rateLimit(`invite:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many invites. Please try again later.' }, { status: 429 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { email, name, role, department } = result.data
  // Use explicitly passed teamId, else fall back to manager's primary team
  const teamId = result.data.teamId ?? me?.team_id ?? null
  const admin = getAdmin()

  // Check if an account with this email already exists in profiles
  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id, team_id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    // Existing account — add them to the team directly (no email invite needed)
    const { error: memberError } = await admin
      .from('team_memberships')
      .upsert({ user_id: existingProfile.id, team_id: teamId })

    if (memberError) {
      logError('manager/invite/POST existing membership', memberError)
      return NextResponse.json({ error: 'Failed to add member to team' }, { status: 500 })
    }

    // Update their primary team if they don't have one
    if (!existingProfile.team_id && teamId) {
      await admin
        .from('profiles')
        .update({ team_id: teamId })
        .eq('id', existingProfile.id)
    }

    logInfo('manager/invite/POST existing', `Added existing user ${existingProfile.id} to team ${teamId}`)
    return NextResponse.json({ success: true, existing: true })
  }

  // New account — send invite email
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role, department: department || null, team_id: teamId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/set-password`,
  })

  if (error) {
    logError('manager/invite/POST', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 400 })
  }

  // Pre-create profile so the member shows up immediately in the dashboard
  if (data.user) {
    await admin.from('profiles').upsert({
      id:         data.user.id,
      name,
      role,
      department: department || null,
      avatar:     name.slice(0, 2).toUpperCase(),
      online:     false,
      team_id:    teamId,
      email,
    })

    // Add to team_memberships
    if (teamId) {
      await admin.from('team_memberships').upsert({ user_id: data.user.id, team_id: teamId })
    }
  }

  return NextResponse.json({ success: true, existing: false })
}
