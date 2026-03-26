'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Pencil, Check, X, Loader2 } from 'lucide-react'

type ScheduleDay = { day: number; timeIn: string; timeOut: string }
type DraftDay    = { day: number; active: boolean; timeIn: string; timeOut: string }

const DAY_LABELS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_ORDER   = [1, 2, 3, 4, 5, 6, 0]
const DEFAULT_IN   = '09:00'
const DEFAULT_OUT  = '17:00'

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}${ampm}`
}

function toDraft(schedule: ScheduleDay[]): DraftDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const entry = schedule.find((s) => s.day === i)
    return { day: i, active: !!entry, timeIn: entry?.timeIn ?? DEFAULT_IN, timeOut: entry?.timeOut ?? DEFAULT_OUT }
  })
}

export default function ManagerScheduleEditor({
  userId,
  memberName,
}: {
  userId: string
  memberName: string
}) {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState<DraftDay[]>([])
  const [saving,   setSaving]   = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    setEditing(false)
    fetch(`/api/manager/schedules?userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        const s = d.schedule ?? []
        setSchedule(s)
        setDraft(toDraft(s))
      })
      .finally(() => setLoading(false))
  }, [userId])

  const startEdit = () => { setDraft(toDraft(schedule)); setEditing(true) }

  const save = async () => {
    setSaving(true)
    setSaveError(null)
    const activeDays = draft
      .filter((d) => d.active)
      .map((d) => ({ day: d.day, timeIn: d.timeIn, timeOut: d.timeOut }))
    try {
      const res  = await fetch('/api/manager/schedules', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, schedule: activeDays }),
      })
      const data = await res.json()
      if (res.ok) {
        setSchedule(activeDays)
        setEditing(false)
      } else {
        setSaveError(data.error ?? 'Failed to save schedule.')
      }
    } catch {
      setSaveError('Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-3 w-40 rounded bg-white/5 mb-4" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/4" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: '#6366f1' }} />
          <h3 className="text-sm font-semibold text-white">Schedule</h3>
          <span className="text-xs text-white/30 truncate">— {memberName}</span>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/8 transition-all"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-white/35 hover:text-white hover:bg-white/8 transition-all"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-60"
              style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(99,102,241,0.4)' }}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
          </div>
        )}
      </div>

      {/* Save error */}
      {saveError && (
        <p className="text-xs text-red-400 mb-2 px-1">{saveError}</p>
      )}

      {/* View mode — compact 7-day grid */}
      {!editing && (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_ORDER.map((day) => {
            const entry = schedule.find((s) => s.day === day)
            return (
              <div
                key={day}
                className="flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl text-center"
                style={{
                  background: entry ? 'rgba(79,70,229,0.12)' : 'rgba(255,255,255,0.03)',
                  border:     `1px solid ${entry ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: entry ? '#818cf8' : 'rgba(255,255,255,0.2)' }}
                >
                  {DAY_LABELS[day]}
                </span>
                {entry ? (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <span className="text-[9px] font-mono leading-tight" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {fmt12(entry.timeIn)}
                    </span>
                    <span className="text-[8px] text-white/20">↓</span>
                    <span className="text-[9px] font-mono leading-tight" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {fmt12(entry.timeOut)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-white/15 mt-1">Off</span>
                )}
              </div>
            )
          })}
          {schedule.length === 0 && (
            <p className="col-span-7 text-xs text-white/25 text-center pt-1">
              No schedule set · click Edit to assign one
            </p>
          )}
        </div>
      )}

      {/* Edit mode — row per day with toggle + time inputs */}
      {editing && (
        <div className="space-y-2">
          {WEEK_ORDER.map((day) => {
            const d = draft.find((x) => x.day === day)!
            return (
              <div
                key={day}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                style={{
                  background: d.active ? 'rgba(79,70,229,0.1)' : 'rgba(255,255,255,0.02)',
                  border:     `1px solid ${d.active ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => setDraft((prev) => prev.map((x) => x.day === day ? { ...x, active: !x.active } : x))}
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: d.active ? '#4f46e5' : 'rgba(255,255,255,0.08)',
                    border:     `1px solid ${d.active ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  {d.active && <Check className="w-2.5 h-2.5 text-white" />}
                </button>

                {/* Day label */}
                <span
                  className="text-xs font-medium w-7 flex-shrink-0"
                  style={{ color: d.active ? '#c4b5fd' : 'rgba(255,255,255,0.25)' }}
                >
                  {DAY_LABELS[day]}
                </span>

                {/* Time inputs or Off label */}
                {d.active ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="time"
                      value={d.timeIn}
                      onChange={(e) =>
                        setDraft((prev) => prev.map((x) => x.day === day ? { ...x, timeIn: e.target.value } : x))
                      }
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs font-mono text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                    />
                    <span className="text-white/25 text-xs flex-shrink-0">→</span>
                    <input
                      type="time"
                      value={d.timeOut}
                      onChange={(e) =>
                        setDraft((prev) => prev.map((x) => x.day === day ? { ...x, timeOut: e.target.value } : x))
                      }
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg text-xs font-mono text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-white/20">Off</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
