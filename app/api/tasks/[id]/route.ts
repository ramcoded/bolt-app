import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError } from '@/lib/logger'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await request.json()
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
    // Employees can only update `completed` on tasks assigned to them
    const { data: task } = await supabase
      .from('tasks')
      .select('assigned_to')
      .eq('id', id)
      .single()

    if (!task || task.assigned_to !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Whitelist: employees may only toggle completed
    const allowedKeys = Object.keys(result.data).filter(k => k === 'completed')
    if (allowedKeys.length === 0 || Object.keys(result.data).length !== allowedKeys.length) {
      return NextResponse.json({ error: 'Forbidden: employees can only update completed status' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(result.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logError('tasks/[id]/PATCH', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) {
    logError('tasks/[id]/DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
