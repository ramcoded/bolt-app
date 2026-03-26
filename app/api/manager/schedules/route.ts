import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyManager(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'manager'
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await verifyManager(supabase, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = getAdmin()
  const { data, error } = await admin
    .from('schedules')
    .select('day_of_week, time_in, time_out')
    .eq('user_id', userId)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schedule = (data ?? []).map((row) => ({
    day:     row.day_of_week,
    timeIn:  row.time_in,
    timeOut: row.time_out,
  }))

  return NextResponse.json({ schedule })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await verifyManager(supabase, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, schedule } = await request.json()
  if (!userId || !Array.isArray(schedule)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = getAdmin()

  // Replace all schedule rows for this user atomically
  await admin.from('schedules').delete().eq('user_id', userId)

  if (schedule.length > 0) {
    const rows = schedule.map((s: { day: number; timeIn: string; timeOut: string }) => ({
      user_id:     userId,
      day_of_week: s.day,
      time_in:     s.timeIn,
      time_out:    s.timeOut,
    }))
    const { error } = await admin.from('schedules').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
