'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { useTimeRecords } from '@/lib/time-records-context'
import { toDateStr } from '@/lib/time-utils'

function fmtMins(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

export default function TodayHoursCard() {
  const { records, timedIn, activeId } = useTimeRecords()
  const [now, setNow] = useState<Date | null>(null)
  const [liveElapsed, setLiveElapsed] = useState(0)

  useEffect(() => { setNow(new Date()) }, [])

  useEffect(() => {
    if (!timedIn || !activeId) { setLiveElapsed(0); return }
    const calc = () => {
      const active = records.find(r => r.id === activeId)
      if (!active) return
      const [h, m] = active.timeIn.split(':').map(Number)
      const start = new Date()
      start.setHours(h, m, 0, 0)
      setLiveElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000)))
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [timedIn, activeId, records])

  if (!now) return null

  const todayStr = toDateStr(now)
  const completedMins = records
    .filter(r => r.date === todayStr && (r.duration ?? 0) > 0)
    .reduce((sum, r) => sum + (r.duration ?? 0), 0)

  const totalMins = completedMins + (timedIn ? liveElapsed : 0)
  const progress  = Math.min(100, Math.round((totalMins / 480) * 100))

  return (
    <div className="glass-card px-4 py-4 h-full flex flex-col justify-between gap-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366f1' }} fill="currentColor" />
        <span className="text-[11px] font-semibold text-white/50 leading-tight">Today&apos;s Hours</span>
        {timedIn && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />}
      </div>

      {/* Big time display */}
      <div>
        <p className="text-2xl font-bold text-white tabular-nums leading-none">
          {totalMins > 0 ? fmtMins(totalMins) : '—'}
        </p>
        <p className="text-[10px] text-white/25 mt-1">of 8h goal</p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/30">{progress}%</span>
          {progress >= 100 && <span className="text-[10px] text-green-400 font-semibold">Goal met!</span>}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? 'linear-gradient(90deg,#4ade80,#22c55e)'
                : 'linear-gradient(90deg,#4f46e5,#6366f1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
