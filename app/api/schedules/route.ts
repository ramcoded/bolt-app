import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Weekly base schedule from user_metadata
  const schedule = (user.user_metadata?.schedule ?? []) as Array<{
    day: number; timeIn: string; timeOut: string
  }>

  // Date-specific overrides for the next 60 days (covers dashboard + upcoming requests)
  const today  = new Date().toISOString().slice(0, 10)
  const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: overrides } = await supabase
    .from('schedule_overrides')
    .select('date, type, time_in, time_out, request_id')
    .eq('user_id', user.id)
    .gte('date', today)
    .lte('date', future)
    .order('date', { ascending: true })

  return NextResponse.json({
    schedule,
    overrides: (overrides ?? []).map((o) => ({
      date:      o.date,
      type:      o.type,
      timeIn:    o.time_in  ?? null,
      timeOut:   o.time_out ?? null,
      requestId: o.request_id ?? null,
    })),
  })
}
