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

async function verifyManager(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role, team_id').eq('id', userId).single()
  return data ?? null
}

async function isInSameTeam(supabase: Awaited<ReturnType<typeof createClient>>, managerTeamId: string | null, targetUserId: string) {
  if (!managerTeamId) return true // no team isolation configured
  const { data } = await supabase.from('profiles').select('team_id').eq('id', targetUserId).single()
  return data?.team_id === managerTeamId
}

const scheduleEntrySchema = z.object({
  day: z.number().int().min(0).max(6),
  timeIn: z.string().regex(/^\d{2}:\d{2}$/),
  timeOut: z.string().regex(/^\d{2}:\d{2}$/),
})

const putSchema = z.object({
  userId: z.string().uuid(),
  schedule: z.array(scheduleEntrySchema),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/schedules/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const me = await verifyManager(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/schedules/GET 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  if (!(await isInSameTeam(supabase, me.team_id, userId))) {
    logInfo('manager/schedules/GET 403', 'Forbidden: user not in same team')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = getAdmin()
  const { data: authUser, error } = await admin.auth.admin.getUserById(userId)
  if (error || !authUser) return NextResponse.json({ schedule: [] })

  const schedule = (authUser.user.user_metadata?.schedule ?? []) as Array<{
    day: number; timeIn: string; timeOut: string
  }>

  return NextResponse.json({ schedule })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/schedules/PUT 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const me = await verifyManager(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/schedules/PUT 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = await request.json()
  const result = putSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { userId, schedule } = result.data

  if (!(await isInSameTeam(supabase, me.team_id, userId))) {
    logInfo('manager/schedules/PUT 403', 'Forbidden: user not in same team')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const admin = getAdmin()

  // Preserve existing metadata, merge in the schedule
  const { data: authUser, error: fetchError } = await admin.auth.admin.getUserById(userId)
  if (fetchError) {
    logError('manager/schedules/PUT', fetchError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const existingMeta = authUser.user.user_metadata ?? {}
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...existingMeta, schedule },
  })

  if (error) {
    logError('manager/schedules/PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
