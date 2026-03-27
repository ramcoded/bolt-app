'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type ScheduleEntry = { day: number; timeIn: string; timeOut: string }

export default function ScheduleCard() {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const todayIndex = new Date().getDay()

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(d => setSchedule(d.schedule ?? []))
      .finally(() => setLoading(false))
  }, [])

  const byDay = Object.fromEntries(schedule.map(s => [s.day, s]))

  return (
    <div className="glass-card px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-white/30" />
        <span className="text-xs font-semibold text-white/60">My Week</span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((label, i) => {
          const entry   = byDay[i]
          const isToday = i === todayIndex
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl"
              style={{
                background: isToday
                  ? 'rgba(99,102,241,0.15)'
                  : entry
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isToday ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <span
                className="text-[11px] font-semibold"
                style={{ color: isToday ? '#818cf8' : 'rgba(255,255,255,0.4)' }}
              >
                {label}
              </span>

              {loading ? (
                <div className="h-3 w-10 rounded bg-white/6 animate-pulse mt-0.5" />
              ) : entry ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span
                    className="text-[10px] font-mono leading-tight"
                    style={{ color: isToday ? '#c7d2fe' : 'rgba(255,255,255,0.5)' }}
                  >
                    {entry.timeIn}
                  </span>
                  <span className="text-[9px] text-white/20">–</span>
                  <span
                    className="text-[10px] font-mono leading-tight"
                    style={{ color: isToday ? '#c7d2fe' : 'rgba(255,255,255,0.5)' }}
                  >
                    {entry.timeOut}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-white/20 mt-0.5">Off</span>
              )}

              {isToday && (
                <span className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: '#6366f1' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
