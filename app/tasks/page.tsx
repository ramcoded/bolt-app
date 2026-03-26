'use client'

import { useState, useEffect } from 'react'
import { Plus, CheckCircle2, Circle, Trash2, X, CalendarDays, User, Flag } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

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

export default function TasksPage() {
  const { profile } = useAuth()
  const isManager   = profile?.role === 'manager'

  const [tasks,     setTasks]     = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filter,    setFilter]    = useState<'all' | 'pending' | 'completed'>('all')
  const [creating,  setCreating]  = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)

  // New task form state
  const [form, setForm] = useState({
    title: '', description: '', date: new Date().toISOString().slice(0, 10),
    priority: 'medium' as 'low' | 'medium' | 'high', assigned_to: '',
  })

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data) => { setTasks(Array.isArray(data) ? data : []); setLoading(false) })
    if (isManager) {
      fetch('/api/team')
        .then((r) => r.json())
        .then((data) => setEmployees(data.filter((m: any) => m.role === 'employee')))
    }
  }, [isManager])

  const filtered = tasks.filter((t) => {
    if (filter === 'pending')   return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const toggleComplete = async (task: Task) => {
    const newCompleted = !task.completed
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: newCompleted } : t))
    setSaveError(null)
    const res = await fetch(`/api/tasks/${task.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ completed: newCompleted }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const msg  = body?.error ?? `HTTP ${res.status}`
      setSaveError(msg)
      // Revert optimistic update
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: task.completed } : t))
    }
  }

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  }

  const createTask = async () => {
    if (!form.title || !form.date) return
    const res = await fetch('/api/tasks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        title:       form.title,
        description: form.description,
        date:        form.date,
        priority:    form.priority,
        assigned_to: form.assigned_to || null,
      }),
    })
    const task = await res.json()
    setTasks((prev) => [...prev, task])
    setForm({ title: '', description: '', date: new Date().toISOString().slice(0, 10), priority: 'medium', assigned_to: '' })
    setCreating(false)
  }

  const assignedEmployee = (id: string | null) =>
    employees.find((e) => e.id === id)

  const pending   = tasks.filter((t) => !t.completed).length
  const completed = tasks.filter((t) =>  t.completed).length

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-white/35 mt-0.5">
            {pending} pending · {completed} completed
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 16px rgba(79,70,229,0.4)' }}
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
            style={
              filter === f
                ? { background: 'rgba(79,70,229,0.25)', color: '#818cf8', border: '1px solid rgba(79,70,229,0.35)' }
                : { color: 'rgba(255,255,255,0.35)' }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* DB error banner */}
      {saveError && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}>
          <span className="text-red-400 font-semibold flex-shrink-0">Save failed:</span>
          <span className="text-red-300 flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400/50 hover:text-red-300 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New task form */}
      {creating && (
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-white">Create Task</h2>
            <button onClick={() => setCreating(false)} className="p-1 rounded-lg text-white/35 hover:text-white hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Task title *"
            className="w-full text-sm text-white placeholder-white/25 outline-none px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          />

          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            rows={2}
            className="w-full text-sm text-white placeholder-white/25 outline-none px-4 py-2.5 rounded-xl resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
          />

          <div className="grid grid-cols-3 gap-3">
            {/* Date */}
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <input
                type="date"
                value={form.date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full text-sm text-white outline-none pl-9 pr-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', colorScheme: 'dark' }}
              />
            </div>

            {/* Priority */}
            <div className="relative">
              <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as any }))}
                className="w-full text-sm text-white outline-none pl-9 pr-3 py-2.5 rounded-xl appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Assign to */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
              <select
                value={form.assigned_to}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                className="w-full text-sm text-white outline-none pl-9 pr-3 py-2.5 rounded-xl appearance-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setCreating(false)} className="btn-ghost text-sm">Cancel</button>
            <button
              onClick={createTask}
              disabled={!form.title || !form.date}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
              style={{ background: 'var(--bolt-accent)' }}
            >
              Create Task
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
              {filter === 'completed' ? 'No completed tasks yet' : 'No tasks assigned'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {filtered.map((task) => {
              const pc  = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium
              const emp = assignedEmployee(task.assignedTo)
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-white/2 transition-colors"
                  style={{ opacity: task.completed ? 0.55 : 1 }}
                >
                  {/* Complete toggle */}
                  <button
                    onClick={() => toggleComplete(task)}
                    className="flex-shrink-0 mt-0.5 transition-colors hover:opacity-80"
                  >
                    {task.completed
                      ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                      : <Circle className="w-5 h-5 text-white/20" />
                    }
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-white ${task.completed ? 'line-through' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-white/40 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Priority badge */}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: pc.bg, border: `1px solid ${pc.border}`, color: pc.text }}>
                        {task.priority}
                      </span>
                      {/* Date */}
                      {task.date && (
                        <span className="text-[11px] text-white/30 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(task.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {/* Assigned to */}
                      {emp && (
                        <span className="flex items-center gap-1 text-[11px] text-white/35">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ background: 'rgba(79,70,229,0.35)' }}>
                            {emp.avatar}
                          </div>
                          {emp.name.split(' ')[0]}
                        </span>
                      )}
                      {!emp && task.assignedTo === null && isManager && (
                        <span className="text-[11px] text-white/20">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* Delete (managers only) */}
                  {isManager && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/8 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/20 text-center">
        Tasks also appear on your Calendar view
      </p>
    </div>
  )
}
