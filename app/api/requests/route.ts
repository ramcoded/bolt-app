import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  type:   z.enum(['overtime', 'pre_shift_overtime', 'leave']),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  hours:  z.number().min(0.5).max(24).optional(),   // required for OT types
  reason: z.string().min(1, 'Reason is required').max(1000),
})

function mapRequest(r: Record<string, unknown>) {
  return {
    id:           r.id,
    type:         r.type,
    date:         r.date,
    hours:        (r.hours as number) ?? null,
    reason:       r.reason,
    status:       r.status,
    reviewerNote: (r.reviewer_note as string) ?? null,
    createdAt:    r.created_at,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('requests/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logError('requests/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json((data ?? []).map(mapRequest))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('requests/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!await rateLimit(`leave-request:${user.id}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { type, date, hours, reason } = result.data

  const today = new Date().toISOString().slice(0, 10)
  if (date < today) {
    return NextResponse.json({ error: 'Cannot submit requests for past dates' }, { status: 400 })
  }

  if (type !== 'leave' && !hours) {
    return NextResponse.json({ error: 'Number of hours is required for overtime requests' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      user_id: user.id,
      team_id: profile?.team_id ?? null,
      type,
      date,
      hours:   type !== 'leave' ? (hours ?? null) : null,
      reason,
      status:  'pending',
    })
    .select()
    .single()

  if (error) {
    logError('requests/POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Notify the team manager
  if (profile?.team_id) {
    const { data: memberProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const { data: manager } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', profile.team_id)
      .eq('role', 'manager')
      .single()

    if (manager) {
      const typeLabel  = type === 'overtime' ? 'Overtime' : type === 'pre_shift_overtime' ? 'Pre-Shift OT' : 'Time Off'
      const memberName = memberProfile?.name ?? 'A team member'
      const title      = `New ${typeLabel} Request`
      const description = `${memberName} submitted a ${typeLabel.toLowerCase()} request for ${date}.`

      const { data: notif } = await getAdmin().from('notifications').insert({
        user_id:     manager.id,
        title,
        description,
        type:        'task',
        read:        false,
      }).select('id').single()

      // Push realtime broadcast so the manager's NotificationDropdown updates instantly
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({
          messages: [{
            topic:   `realtime:notifs-${manager.id}`,
            event:   'new_notification',
            payload: { id: notif?.id, title, description, type: 'task' },
          }],
        }),
      }).catch(() => {}) // non-fatal
    }
  }

  return NextResponse.json(mapRequest(data), { status: 201 })
}
