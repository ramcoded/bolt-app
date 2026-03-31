'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ScheduleEntry  = { day: number; timeIn: string; timeOut: string }
type ScheduleOverride = { date: string; type: string; timeIn: string | null; timeOut: string | null }

// Returns the ISO date string (YYYY-MM-DD) for the given day-of-week index
// relative to the current week.
function weekDate(dayIndex: number): string {
  const today = new Date()
  const d = new Date(today)
  d.setDate(today.getDate() + (dayIndex - today.getDay()))
  return d.toISOString().slice(0, 10)
}

const OVERRIDE_LABEL: Record<string, string> = {
  overtime:           'OT',
  pre_shift_overtime: 'Pre-OT',
  leave:              'Leave',
}

const OVERRIDE_COLOR: Record<string, string> = {
  overtime:           '#6366f1',
  pre_shift_overtime: '#8b5cf6',
  leave:              '#06b6d4',
}

export default function ScheduleCard() {
  const [schedule,  setSchedule]  = useState<ScheduleEntry[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])
  const [loading,   setLoading]   = useState(true)
  const todayIndex = new Date().getDay()

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(d => {
        setSchedule(d.schedule ?? [])
        setOverrides(d.overrides ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const byDay      = Object.fromEntries(schedule.map(s => [s.day, s]))
  const overrideMap = Object.fromEntries(overrides.map(o => [o.date, o]))

  return (
    <div className="glass-card px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-white/30" />
        <span className="text-xs font-semibold text-white/60">My Week</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((label, i) => {
          const date     = weekDate(i)
          const override = overrideMap[date]
          const entry    = byDay[i]
          const isToday  = i === todayIndex
          const isLeave  = override?.type === 'leave'
          const overrideColor = override ? OVERRIDE_COLOR[override.type] ?? '#6366f1' : null

          // Effective times: override wins over base schedule
          const showTimeIn  = override ? override.timeIn  : entry?.timeIn
          const showTimeOut = override ? override.timeOut : entry?.timeOut
          const hasShift    = !!(showTimeIn && showTimeOut)

          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl relative"
              style={{
                background: isToday
                  ? 'rgba(99,102,241,0.15)'
                  : override
                  ? `${overrideColor}12`
                  : entry
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${
                  isToday
                    ? 'rgba(99,102,241,0.35)'
                    : override
                    ? `${overrideColor}40`
                    : 'rgba(255,255,255,0.06)'
                }`,
              }}
            >
              <span
                className="text-[11px] font-semibold"
                style={{ color: isToday ? '#818cf8' : override ? overrideColor! : 'rgba(255,255,255,0.4)' }}
              >
                {label}
              </span>

              {loading ? (
                <div className="h-3 w-10 rounded bg-white/6 animate-pulse mt-0.5" />
              ) : isLeave ? (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                  style={{ background: `${overrideColor}20`, color: overrideColor! }}
                >
                  Leave
                </span>
              ) : hasShift ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-[10px] font-mono leading-tight"
                    style={{ color: isToday ? '#c7d2fe' : override ? overrideColor! : 'rgba(255,255,255,0.5)' }}
                  >
                    {showTimeIn}
                  </span>
                  <span className="text-[9px] text-white/20">–</span>
                  <span
                    className="text-[10px] font-mono leading-tight"
                    style={{ color: isToday ? '#c7d2fe' : override ? overrideColor! : 'rgba(255,255,255,0.5)' }}
                  >
                    {showTimeOut}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-white/20 mt-0.5">Off</span>
              )}

              {/* Override badge */}
              {override && !isLeave && (
                <span
                  className="text-[8px] font-bold px-1 rounded mt-0.5"
                  style={{ background: `${overrideColor}25`, color: overrideColor! }}
                >
                  {OVERRIDE_LABEL[override.type] ?? 'OT'}
                </span>
              )}

              {isToday && (
                <span
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{ background: override ? overrideColor! : '#6366f1' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
