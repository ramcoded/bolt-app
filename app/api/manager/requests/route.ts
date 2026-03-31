import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logError, logInfo } from '@/lib/logger'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export const dynamic = 'force-dynamic'

async function getManagerProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', userId)
    .single()
  return data
}

// GET /api/manager/requests?status=pending|all
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/requests/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const me = await getManagerProfile(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/requests/GET 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!me.team_id) return NextResponse.json([])

  const { searchParams } = new URL(request.url)
  const statusFilter = searchParams.get('status') ?? 'pending'

  // Get all team members (excluding manager themselves)
  const { data: members } = await supabase
    .from('profiles')
    .select('id, name, avatar')
    .eq('team_id', me.team_id)
    .neq('id', user.id)

  if (!members?.length) return NextResponse.json([])

  const memberIds = members.map(m => m.id)
  const memberMap = new Map(members.map(m => [m.id, m]))

  let query = supabase
    .from('leave_requests')
    .select('id, user_id, type, date, hours, reason, status, reviewer_note, created_at')
    .in('user_id', memberIds)
    .order('created_at', { ascending: false })
    .limit(200)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    logError('manager/requests/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const requests = (data ?? []).map(r => ({
    id:           r.id,
    type:         r.type,
    date:         r.date,
    hours:        r.hours,
    reason:       r.reason,
    status:       r.status,
    reviewerNote: r.reviewer_note,
    createdAt:    r.created_at,
    member:       memberMap.get(r.user_id) ?? { id: r.user_id, name: 'Unknown', avatar: null },
  }))

  return NextResponse.json(requests)
}

// PATCH /api/manager/requests  { id, action: 'grant'|'reject', note? }
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('manager/requests/PATCH 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const me = await getManagerProfile(supabase, user.id)
  if (me?.role !== 'manager') {
    logInfo('manager/requests/PATCH 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { id, action, note } = body

  if (!id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (!['grant', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  // Fetch the request to verify it belongs to a team member
  const { data: req, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('id, user_id, type, date, hours, status, team_id')
    .eq('id', id)
    .single()

  if (fetchErr || !req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (req.team_id !== me.team_id) {
    logInfo('manager/requests/PATCH 403', 'Forbidden: request not in manager team')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (req.status !== 'pending') return NextResponse.json({ error: 'Request already reviewed' }, { status: 409 })

  const newStatus = action === 'grant' ? 'granted' : 'rejected'

  const admin = getAdmin()

  const { error: updateErr } = await admin
    .from('leave_requests')
    .update({
      status:        newStatus,
      reviewer_id:   user.id,
      reviewer_note: note?.trim() || null,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', id)

  if (updateErr) {
    logError('manager/requests/PATCH update', updateErr)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // If granted, create or update schedule_override for the member
  if (action === 'grant') {
    // Fetch the member's base schedule from their user_metadata
    const { data: { user: memberUser } } = await admin.auth.admin.getUserById(req.user_id)
    const entries: { day: number; timeIn: string; timeOut: string }[] =
      (memberUser?.user_metadata?.schedule ?? [])
    const dayIndex = new Date(req.date + 'T00:00:00').getDay()
    const base = entries.find(e => e.day === dayIndex)

    let timeIn: string | null  = base?.timeIn  ?? null
    let timeOut: string | null = base?.timeOut ?? null

    if (base && req.hours) {
      if (req.type === 'overtime') {
        const [h, m] = base.timeOut.split(':').map(Number)
        let total = h * 60 + m + Math.round(req.hours * 60)
        total = ((total % 1440) + 1440) % 1440
        timeOut = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
      } else if (req.type === 'pre_shift_overtime') {
        const [h, m] = base.timeIn.split(':').map(Number)
        let total = h * 60 + m - Math.round(req.hours * 60)
        total = ((total % 1440) + 1440) % 1440
        timeIn = `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
      }
    }

    const overrideType = req.type === 'leave' ? 'leave' : req.type

    const { error: overrideErr } = await admin
      .from('schedule_overrides')
      .upsert(
        {
          user_id:    req.user_id,
          date:       req.date,
          type:       overrideType,
          time_in:    req.type === 'leave' ? null : timeIn,
          time_out:   req.type === 'leave' ? null : timeOut,
          request_id: req.id,
        },
        { onConflict: 'user_id,date' },
      )

    if (overrideErr) {
      logError('manager/requests/PATCH override', overrideErr)
      // Don't fail — the status was already updated
    }
  }

  // Notify the member about the decision
  const typeLabel   = req.type === 'overtime' ? 'Overtime' : req.type === 'pre_shift_overtime' ? 'Pre-Shift OT' : 'Time Off'
  const actionLabel = action === 'grant' ? 'Approved' : 'Rejected'
  const title       = `Request ${actionLabel}`
  const description = `Your ${typeLabel.toLowerCase()} request for ${req.date} was ${actionLabel.toLowerCase()}.${note?.trim() ? ` Note: ${note.trim()}` : ''}`

  const { data: notif } = await admin.from('notifications').insert({
    user_id:     req.user_id,
    title,
    description,
    type:        'task',
    read:        false,
  }).select('id').single()

  // Push realtime broadcast so the member's NotificationDropdown updates instantly
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    body: JSON.stringify({
      messages: [{
        topic:   `realtime:notifs-${req.user_id}`,
        event:   'new_notification',
        payload: { id: notif?.id, title, description, type: 'task' },
      }],
    }),
  }).catch(() => {}) // non-fatal

  logInfo('manager/requests/PATCH audit', `Manager ${user.id} set request ${id} to ${newStatus}`)
  return NextResponse.json({ success: true })
}
