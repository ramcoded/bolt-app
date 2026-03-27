import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('time_records')
    .select('date, time_in, time_out, duration')
    .eq('user_id', user.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })

  if (error) {
    logError('timeline/export/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })

  // Build CSV
  const rows = (data ?? []).map((r: any) => {
    const durationMins = r.duration ?? null
    const hours = durationMins !== null ? Math.floor(durationMins / 60) : ''
    const mins  = durationMins !== null ? durationMins % 60 : ''
    const durationStr = durationMins !== null ? `${hours}h ${String(mins).padStart(2, '0')}m` : 'Ongoing'
    return [r.date, r.time_in ?? '', r.time_out ?? '', durationStr].join(',')
  })

  const csv = [
    `Time Report — ${profile?.name ?? 'Employee'} — ${monthName} ${year}`,
    '',
    'Date,Time In,Time Out,Duration',
    ...rows,
  ].join('\r\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="timeline-${year}-${String(month).padStart(2,'0')}.csv"`,
    },
  })
}
