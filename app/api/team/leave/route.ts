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
  teamId: z.string().uuid(),
})

// POST /api/team/leave — leave a team
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('team/leave/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json().catch(() => null)
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { teamId } = result.data
  const admin = getAdmin()

  // Remove from team_memberships
  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('user_id', user.id)
    .eq('team_id', teamId)

  if (error) {
    logError('team/leave/POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // If this was their primary team, update profiles.team_id to another team or null
  const { data: profile } = await admin
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (profile?.team_id === teamId) {
    // Find another team membership
    const { data: other } = await admin
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    await admin
      .from('profiles')
      .update({ team_id: other?.team_id ?? null })
      .eq('id', user.id)
  }

  return NextResponse.json({ success: true })
}
