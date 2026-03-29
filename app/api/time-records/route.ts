import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

function mapRecord(r: Record<string, unknown>) {
  return {
    id:       r.id,
    date:     r.date,
    timeIn:   r.time_in,
    timeOut:  (r.time_out as string) ?? null,
    duration: (r.duration as number) ?? null,
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const { data, error } = await supabase
    .from('time_records')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('time_in', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logError('time-records/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json((data ?? []).map(mapRecord))
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: 10 clock-ins per hour per user
  if (!await rateLimit(`clock-in:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  // Prevent multiple active clock-ins
  const { data: active } = await supabase
    .from('time_records')
    .select('id')
    .eq('user_id', user.id)
    .is('time_out', null)
    .maybeSingle()

  if (active) return NextResponse.json({ error: 'Already clocked in' }, { status: 409 })

  const now    = new Date()
  const year   = now.getFullYear()
  const month  = String(now.getMonth() + 1).padStart(2, '0')
  const day    = String(now.getDate()).padStart(2, '0')
  const date   = `${year}-${month}-${day}`
  const timeIn = now.toTimeString().slice(0, 5)

  const { data, error } = await supabase
    .from('time_records')
    .insert({ user_id: user.id, date, time_in: timeIn })
    .select()
    .single()

  if (error) {
    logError('time-records/POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json(mapRecord(data))
}
