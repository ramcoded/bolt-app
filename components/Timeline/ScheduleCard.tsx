'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

type ScheduleDay     = { day: number; timeIn: string; timeOut: string }
type ScheduleOverride = { date: string; type: string; timeIn: string | null; timeOut: string | null }

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] // Mon → Sun

const OVERRIDE_COLOR: Record<string, string> = {
  overtime:           '#818cf8',
  pre_shift_overtime: '#a78bfa',
  leave:              '#22d3ee',
}
const OVERRIDE_LABEL: Record<string, string> = {
  overtime:           'OT',
  pre_shift_overtime: 'Pre-OT',
  leave:              'Day Off',
}

function fmt12(time: string) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}${m > 0 ? `:${String(m).padStart(2, '0')}` : ''}${ampm}`
}

// Returns the ISO date string for a given day-of-week index in the current week
function weekDate(dayIndex: number): string {
  const today = new Date()
  const d = new Date(today)
  d.setDate(today.getDate() + (dayIndex - today.getDay()))
  return d.toISOString().slice(0, 10)
}

export default function ScheduleCard() {
  const [schedule,  setSchedule]  = useState<ScheduleDay[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/schedules')
      .then((r) => r.json())
      .then((d) => {
        setSchedule(d.schedule ?? [])
        setOverrides(d.overrides ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-3 w-32 rounded bg-white/5 mb-4" />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/4" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 flex-shrink-0" style={{ color: '#6366f1' }} />
        <h3 className="text-sm font-semibold text-white">Weekly Schedule</h3>
        {schedule.length === 0 && (
          <span className="text-[10px] text-white/25 ml-auto">No schedule assigned yet</span>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_ORDER.map((day) => {
          const date     = weekDate(day)
          const override = overrides.find((o) => o.date === date) ?? null
          const entry    = schedule.find((s) => s.day === day)
          const oc       = override ? (OVERRIDE_COLOR[override.type] ?? '#818cf8') : null
          const isLeave  = override?.type === 'leave'

          const timeIn  = override ? override.timeIn  : entry?.timeIn
          const timeOut = override ? override.timeOut : entry?.timeOut

          return (
            <div
              key={day}
              className="flex flex-col items-center gap-1 px-1 py-2.5 rounded-xl text-center"
              style={{
                background: override
                  ? `${oc}18`
                  : entry
                  ? 'rgba(79,70,229,0.12)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${override ? `${oc}40` : entry ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}
            >
              <span
                className="text-[10px] font-semibold"
                style={{ color: override ? oc! : entry ? '#818cf8' : 'rgba(255,255,255,0.2)' }}
              >
                {DAY_LABELS[day]}
              </span>

              {isLeave ? (
                <span className="text-[9px] font-semibold mt-0.5" style={{ color: oc! }}>
                  {OVERRIDE_LABEL.leave}
                </span>
              ) : timeIn && timeOut ? (
                <div className="flex flex-col items-center gap-0.5 mt-0.5">
                  <span className="text-[9px] font-mono leading-tight" style={{ color: override ? oc! : 'rgba(255,255,255,0.7)' }}>
                    {fmt12(timeIn)}
                  </span>
                  <span className="text-[8px] text-white/20">↓</span>
                  <span className="text-[9px] font-mono leading-tight" style={{ color: override ? oc! : 'rgba(255,255,255,0.7)' }}>
                    {fmt12(timeOut)}
                  </span>
                  {override && (
                    <span className="text-[8px] font-bold mt-0.5" style={{ color: oc! }}>
                      {OVERRIDE_LABEL[override.type]}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[9px] text-white/15 mt-1">Off</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
