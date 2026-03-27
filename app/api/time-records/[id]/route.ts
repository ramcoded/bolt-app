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

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: record } = await supabase
    .from('time_records')
    .select('time_in')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now     = new Date()
  const timeOut = now.toTimeString().slice(0, 5)
  const [inH, inM]   = record.time_in.split(':').map(Number)
  const [outH, outM] = timeOut.split(':').map(Number)
  let duration = outH * 60 + outM - (inH * 60 + inM)
  if (duration < 0) duration += 24 * 60 // handle midnight crossover

  const { data, error } = await supabase
    .from('time_records')
    .update({ time_out: timeOut, duration })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapRecord(data))
}
