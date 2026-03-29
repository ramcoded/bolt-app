'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Trash2, X, CalendarDays, Users, Flag, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import AvatarImage from '@/components/AvatarImage'
import { useToast } from '@/components/Toast'

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
}

function mapTaskRT(t: any): Task {
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

type Task = {
  id: string
  title: string
  description: string
  date: string
  priority: 'low' | 'medium' | 'high'
  assignedTo: string | null
  completed: boolean
  createdBy: string | null
  color: string
}

type Employee = { id: string; name: string; avatar: string }

const PRIORITY_COLOR = {
  high:   { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  low:    { bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.35)',  text: '#22c55e' },
}

const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }

export default function TasksPage() {
  const { profile }  = useAuth()
  const isManager    = profile?.role === 'manager'
  const { addToast } = useToast()

  const [tasks,      setTasks]      = useState<Task[]>([])
  const [employees,  setEmployees]  = useState<Employee[]>([])
  const [filter,     setFilter]     = useState<'all' | 'pending' | 'completed'>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [creating,   setCreating]   = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)

  const [today, setToday] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', date: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  useEffect(() => {
    if (!confirmTask) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirmTask(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirmTask])

  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    setToday(todayStr)
    setForm((f) => ({ ...f, date: todayStr }))
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data) => { setTasks(Array.isArray(data) ? data : []); setLoading(false) })
    if (isManager) {
      fetch('/api/team')
        .then((r) => r.json())
        .then((data) => setEmployees(data.filter((m: any) => m.role === 'member')))
    }
  }, [isManager])

  // Realtime task sync
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()
    const channel  = supabase
      .channel('tasks-live')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload: any) => {
        const t = mapTaskRT(payload.new)
        // employees only care about tasks assigned to them
        if (!isManager && t.assignedTo !== profile.id) return
        setTasks((prev) => prev.find((x) => x.id === t.id) ? prev : [...prev, t])
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'tasks' }, (payload: any) => {
        const t = mapTaskRT(payload.new)
        if (!isManager && t.assignedTo !== profile.id) return
        setTasks((prev) => prev.map((x) => x.id === t.id ? t : x))
      })
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'tasks' }, (payload: any) => {
        setTasks((prev) => prev.filter((x) => x.id !== payload.old.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, isManager])

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )

  const selectAll = () =>
    setSelectedMembers(employees.map((e) => e.id))

  const filtered = tasks.filter((t) => {
    if (filter === 'pending'   && t.completed)  return false
    if (filter === 'completed' && !t.completed) return false
    if (isManager && memberFilter !== 'all' && t.assignedTo !== memberFilter) return false
    return true
  })

  const markDone = async (task: Task) => {
    setConfirmTask(null)
    setCompleting(task.id)
    setSaveError(null)
    const res = await fetch(`/api/tasks/${task.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ completed: true }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(body?.error ?? `HTTP ${res.status}`)
    } else {
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true } : t))
      addToast('Task completed', `"${task.title}" marked as finished`, 'task')
    }
    setCompleting(null)
  }

  const deleteTask = async (id: string) => {
    const prev = tasks
    setTasks((t) => t.filter((x) => x.id !== id))
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setTasks(prev)
      setSaveError('Failed to delete task')
    }
  }

  const createTask = async () => {
    if (!form.title || !form.date) return
    setSubmitting(true)
    try {
      // Create one task per selected member (or unassigned if none selected)
      const targets = selectedMembers.length > 0 ? selectedMembers : [null]
      const created: Task[] = []
      const supabase = createClient()
      for (const memberId of targets) {
        const res = await fetch('/api/tasks', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            title:       form.title,
            description: form.description,
            date:        form.date,
            priority:    form.priority,
            assigned_to: memberId,
          }),
        })
        if (res.ok) {
          created.push(await res.json())
          // Broadcast notification to the assigned employee for guaranteed real-time delivery
          if (memberId) {
            const ch = supabase.channel(`notifs-${memberId}`)
            ch.subscribe((status: string) => {
              if (status === 'SUBSCRIBED') {
                ch.send({
                  type:    'broadcast',
                  event:   'new_notification',
                  payload: {
                    id:          `bc-${Date.now()}-${memberId}`,
                    title:       `New task assigned: ${form.title}`,
                    description: `${profile?.name ?? 'Manager'} assigned you a task due ${form.date}.`,
                    type:        'task',
                  },
                }).finally(() => supabase.removeChannel(ch))
              }
            })
          }
        }
      }
      setTasks((prev) => [...prev, ...created])
      setForm({ title: '', description: '', date: today, priority: 'medium' })
      const assignedNames = selectedMembers
        .map((id) => employees.find((e) => e.id === id)?.name.split(' ')[0])
        .filter(Boolean)
        .join(', ')
      addToast(
        created.length === 1 ? 'Task assigned' : `${created.length} tasks assigned`,
        assignedNames ? `Assigned to ${assignedNames}` : 'Task created successfully',
        'task',
      )
      setSelectedMembers([])
      setCreating(false)
    } finally {
      setSubmitting(false)
    }
  }

  const emp = (id: string | null) => employees.find((e) => e.id === id)
  const pending   = tasks.filter((t) => !t.completed).length
  const completed = tasks.filter((t) =>  t.completed).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-white/35 mt-0.5">{pending} pending · {completed} completed</p>
        </div>
        {isManager && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}
          >
            <Plus className="w-4 h-4" />
            Assign Task
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        {/* Status filter */}
        <div className="flex gap-1 p-1 rounded-xl flex-1 min-w-[200px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={filter === f
                ? { background: 'rgba(79,70,229,0.25)', color: '#818cf8', border: '1px solid rgba(79,70,229,0.35)' }
                : { color: 'rgba(255,255,255,0.35)' }}
            >{f}</button>
          ))}
        </div>

        {/* Member filter (manager only) */}
        {isManager && employees.length > 0 && (
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', colorScheme: 'dark' }}
          >
            <option value="all">All Members</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Error banner */}
      {saveError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}>
          <span className="text-red-400 font-semibold flex-shrink-0">Save failed:</span>
          <span className="text-red-300 flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400/50 hover:text-red-300 flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Create task form */}
      {creating && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Assign New Task</h2>
            <button onClick={() => setCreating(false)} className="p-1 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Task title *"
            className="w-full text-sm text-white placeholder-white/25 outline-none px-4 py-2.5 rounded-xl"
            style={inputStyle}
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full text-sm text-white placeholder-white/25 outline-none px-4 py-2.5 rounded-xl resize-none"
            style={inputStyle}
          />

          {/* Deadline + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-white/35 mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" /> Deadline *
              </p>
              <input
                type="date"
                value={form.date}
                min={today}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full text-sm text-white outline-none px-3 py-2.5 rounded-xl"
                style={{ ...inputStyle, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <p className="text-[11px] text-white/35 mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3 h-3" /> Priority
              </p>
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button key={p} onClick={() => setForm((f) => ({ ...f, priority: p }))}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={form.priority === p
                      ? { background: PRIORITY_COLOR[p].bg, border: `1px solid ${PRIORITY_COLOR[p].border}`, color: PRIORITY_COLOR[p].text }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
                  >{p}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Member picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-white/35 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Assign to members
                {selectedMembers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'rgba(79,70,229,0.4)' }}>{selectedMembers.length}</span>
                )}
              </p>
              <button onClick={selectedMembers.length === employees.length ? () => setSelectedMembers([]) : selectAll}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                {selectedMembers.length === employees.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {employees.map((e) => {
                const sel = selectedMembers.includes(e.id)
                return (
                  <button key={e.id} onClick={() => toggleMember(e.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                    style={sel
                      ? { background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.45)', color: '#a5b4fc' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)' }}
                  >
                    <span className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: sel ? 'rgba(79,70,229,0.5)' : 'rgba(255,255,255,0.1)' }}>
                      {sel ? <Check className="w-3 h-3" /> : <AvatarImage src={e.avatar} alt={e.name} fallback={e.name[0]} />}
                    </span>
                    {e.name.split(' ')[0]}
                  </button>
                )
              })}
              {employees.length === 0 && (
                <p className="text-xs text-white/25">No team members found</p>
              )}
            </div>
            {selectedMembers.length === 0 && (
              <p className="text-[11px] text-white/25 mt-2">No members selected — task will be unassigned</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setCreating(false)} className="btn-ghost text-sm">Cancel</button>
            <button
              onClick={createTask}
              disabled={!form.title || !form.date || submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: 'var(--bolt-accent)' }}
            >
              {submitting ? 'Creating…' : selectedMembers.length > 1
                ? `Assign to ${selectedMembers.length} members`
                : 'Create Task'}
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="px-5 py-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-5 h-5 rounded-full bg-white/5 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 rounded bg-white/5" />
                  <div className="h-2.5 w-32 rounded bg-white/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-white/30">
              {filter === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filtered.map((task) => {
              const pc     = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium
              const member = emp(task.assignedTo)
              const isOverdue = !task.completed && task.date && task.date < today
              return (
                <div key={task.id}
                  className="flex items-start gap-4 px-5 py-4 transition-colors"
                  style={{
                    opacity: task.completed ? 0.5 : 1,
                    background: task.completed ? 'rgba(255,255,255,0.01)' : undefined,
                  }}
                >
                  {/* Status indicator */}
                  <div className="flex-shrink-0 mt-0.5">
                    {task.completed
                      ? <CheckCircle2 className="w-5 h-5 text-green-400/60" />
                      : <div className="w-5 h-5 rounded-full border-2 border-white/15" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.completed ? 'line-through text-white/40' : 'text-white'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-white/40 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {task.completed ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                          Finished
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}>
                          {task.priority}
                        </span>
                      )}
                      {task.date && (
                        <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-white/30'}`}>
                          <CalendarDays className="w-3 h-3" />
                          {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {isOverdue && <span className="font-semibold">· Overdue</span>}
                        </span>
                      )}
                      {member && (
                        <span className="flex items-center gap-1 text-[11px] text-white/35">
                          <span className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: 'rgba(79,70,229,0.35)' }}>
                            <AvatarImage src={member.avatar} alt={member.name} fallback={member.name[0]} />
                          </span>
                          {member.name.split(' ')[0]}
                        </span>
                      )}
                      {!member && task.assignedTo === null && isManager && (
                        <span className="text-[11px] text-white/20">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!task.completed && (
                      <button
                        onClick={() => setConfirmTask(task)}
                        disabled={completing === task.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)', color: '#4ade80' }}
                      >
                        {completing === task.id ? 'Saving…' : 'Mark as Done'}
                      </button>
                    )}
                    {isManager && (
                      <button onClick={() => deleteTask(task.id)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/8 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/20 text-center">Tasks also appear on your Calendar view</p>

      {/* Confirmation modal */}
      {confirmTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setConfirmTask(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.30)' }}>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Mark as finished?</h3>
                <p className="text-xs text-white/40 mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-white/60 px-1">
              Are you sure you want to mark <span className="text-white font-medium">"{confirmTask.title}"</span> as done? Once confirmed, this task cannot be reopened.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmTask(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => markDone(confirmTask)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'rgba(34,197,94,0.20)', border: '1px solid rgba(34,197,94,0.40)', color: '#4ade80' }}
              >
                Yes, mark as done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
