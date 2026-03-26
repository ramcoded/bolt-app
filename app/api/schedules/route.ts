import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('schedules')
    .select('day_of_week, time_in, time_out')
    .eq('user_id', user.id)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const schedule = (data ?? []).map((row) => ({
    day:     row.day_of_week,
    timeIn:  row.time_in,
    timeOut: row.time_out,
  }))

  return NextResponse.json({ schedule })
}
