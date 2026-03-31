import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}

function mapTask(t: Record<string, unknown>) {
  return {
    id:          t.id,
    date:        t.date,
    title:       t.title,
    description: (t.description as string) ?? '',
    color:       (t.color as string) ?? PRIORITY_COLORS[t.priority as string] ?? '#6366f1',
    priority:    (t.priority as string) ?? 'medium',
    assignedTo:  (t.assigned_to as string) ?? null,
    completed:   (t.completed as boolean) ?? false,
    createdBy:   (t.created_by as string) ?? null,
  }
}

const postSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  assigned_to: z.string().uuid().nullable().optional(),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('tasks/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  let query = supabase.from('tasks').select('*').order('date', { ascending: true }).range(offset, offset + limit - 1)

  if (profile?.role === 'member') {
    // Members only see tasks assigned to them
    query = query.eq('assigned_to', user.id)
  } else if (profile?.role === 'manager' && profile.team_id) {
    // Managers only see tasks for their team members or tasks they created unassigned
    const { data: teamMembers } = await supabase
      .from('profiles')
      .select('id')
      .eq('team_id', profile.team_id)
    const memberIds = (teamMembers ?? []).map((m) => m.id)
    if (memberIds.length > 0) {
      query = query.or(
        `assigned_to.in.(${memberIds.join(',')}),and(created_by.eq.${user.id},assigned_to.is.null)`
      )
    } else {
      // No team members at all — only own unassigned tasks
      query = query.eq('created_by', user.id).is('assigned_to', null)
    }
  }

  const { data, error } = await query
  if (error) {
    logError('tasks/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json((data ?? []).map(mapTask))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('tasks/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    logInfo('tasks/POST 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { title, description, date, priority, assigned_to } = result.data

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, description, date, priority, assigned_to, created_by: user.id })
    .select()
    .single()

  if (error) {
    logError('tasks/POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Notify the assigned user
  if (assigned_to) {
    const { data: assigner } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    await adminClient().from('notifications').insert({
      user_id:     assigned_to,
      type:        'task',
      title:       `New task assigned: ${title}`,
      description: `${assigner?.name ?? 'Manager'} assigned you a task due ${data.date}.`,
      read:        false,
    })
  }

  return NextResponse.json(mapTask(data))
}
