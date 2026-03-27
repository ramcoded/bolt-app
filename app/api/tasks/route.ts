import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
  low:    '#22c55e',
}

function mapTask(t: any) {
  return {
    id:          t.id,
    date:        t.date,
    title:       t.title,
    description: t.description ?? '',
    color:       t.color ?? PRIORITY_COLORS[t.priority] ?? '#6366f1',
    priority:    t.priority ?? 'medium',
    assignedTo:  t.assigned_to ?? null,
    completed:   t.completed ?? false,
    createdBy:   t.created_by ?? null,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase.from('tasks').select('*').order('date', { ascending: true })

  // Employees only see tasks assigned to them
  if (profile?.role === 'employee') {
    query = query.eq('assigned_to', user.id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(mapTask))
}

export async function POST(request: Request) {
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

  const { title, description, date, priority, assigned_to } = await request.json()

  const { data, error } = await supabase
    .from('tasks')
    .insert({ title, description, date, priority, assigned_to, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the assigned user
  if (assigned_to) {
    const { data: assigner } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    await supabase.from('notifications').insert({
      user_id:     assigned_to,
      type:        'task',
      title:       `New task assigned: ${title}`,
      description: `${assigner?.name ?? 'Manager'} assigned you a task due ${data.date}.`,
      read:        false,
    })
  }

  return NextResponse.json(mapTask(data))
}
