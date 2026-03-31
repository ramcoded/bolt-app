import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logError, logInfo } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function mapRecord(r: any) {
  return {
    id:       r.id,
    date:     r.date,
    timeIn:   r.time_in,
    timeOut:  r.time_out ?? null,
    duration: r.duration ?? null,
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/time-records/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    logInfo('manager/time-records/GET 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Verify the requested user belongs to the same team
  if (profile.team_id) {
    const { data: target } = await supabase
      .from('profiles').select('team_id').eq('id', userId).single()
    if (target?.team_id !== profile.team_id) {
      logInfo('manager/time-records/GET 403', 'Forbidden: user not in same team')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const db = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await db
    .from('time_records')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('time_in', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logError('manager/time-records/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json((data ?? []).map(mapRecord))
}
