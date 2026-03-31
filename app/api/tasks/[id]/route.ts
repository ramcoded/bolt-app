import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  assigned_to: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  color: z.string().max(20).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('tasks/[id]/PATCH 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = patchSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManager = profile?.role === 'manager'

  if (!isManager) {
    // Members can only update `completed` on tasks assigned to them
    const { data: task } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', id)
      .single()

    if (!task || task.assigned_to !== user.id) {
      logInfo('tasks/[id]/PATCH 403', 'Forbidden: task not assigned to user')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Whitelist: members may only set completed
    const allowedKeys = Object.keys(result.data).filter(k => k === 'completed')
    if (allowedKeys.length === 0 || Object.keys(result.data).length !== allowedKeys.length) {
      logInfo('tasks/[id]/PATCH 403', 'Forbidden: members can only update completed status')
      return NextResponse.json({ error: 'Forbidden: members can only update completed status' }, { status: 403 })
    }
  }

  // One-way protection: completed tasks are immutable — no field can be changed
  // Use admin client to bypass RLS (authorization already verified above)
  const admin = getAdmin()
  const { data: existing } = await admin
    .from('tasks')
    .select('completed')
    .eq('id', id)
    .single()

  if (existing?.completed === true) {
    return NextResponse.json({ error: 'Completed tasks cannot be modified' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('tasks')
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('tasks/[id]/PATCH', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Notify the manager when a task is marked as completed
  if (result.data.completed === true && data.assigned_to) {
    const { data: member } = await admin
      .from('profiles')
      .select('name, team_id')
      .eq('id', data.assigned_to)
      .single()

    if (member?.team_id) {
      const { data: manager } = await admin
        .from('profiles')
        .select('id')
        .eq('team_id', member.team_id)
        .eq('role', 'manager')
        .single()

      if (manager?.id) {
        await admin.from('notifications').insert({
          user_id:     manager.id,
          type:        'task',
          title:       `Task completed: ${data.title}`,
          description: `${member.name ?? 'A team member'} marked the task as finished.`,
          read:        false,
        })
      }
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('tasks/[id]/DELETE 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    logInfo('tasks/[id]/DELETE 403', 'Forbidden: not a manager')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // H3: Verify the task's assigned user belongs to the manager's team
  const admin = getAdmin()
  const { data: task } = await admin.from('tasks').select('assigned_to').eq('id', id).single()
  if (task?.assigned_to) {
    const { data: assignee } = await admin.from('profiles').select('team_id').eq('id', task.assigned_to).single()
    if (assignee?.team_id !== profile.team_id) {
      logInfo('tasks/[id]/DELETE 403', 'Forbidden: task assigned to user outside manager team')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) {
    logError('tasks/[id]/DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
