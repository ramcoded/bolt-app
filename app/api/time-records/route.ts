import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function mapRecord(r: any) {
  return {
    id:       r.id,
    date:     r.date,
    timeIn:   r.time_in,
    timeOut:  r.time_out ?? null,
    duration: r.duration ?? null,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('time_records')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('time_in', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(mapRecord))
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Prevent multiple active clock-ins
  const { data: active } = await supabase
    .from('time_records')
    .select('id')
    .eq('user_id', user.id)
    .is('time_out', null)
    .maybeSingle()

  if (active) return NextResponse.json({ error: 'Already clocked in' }, { status: 409 })

  const now    = new Date()
  // Use local date (not UTC) so it matches the client-side toDateStr() comparison
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapRecord(data))
}
