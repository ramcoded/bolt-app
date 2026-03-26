'use client'

import { useEffect, useState } from 'react'
import { Clock, LogIn, Timer } from 'lucide-react'
import { formatDuration, toDateStr } from '@/lib/time-utils'
import { useTimeRecords } from '@/lib/time-records-context'
import { useAuth } from '@/lib/auth-context'

export default function ProfileCard() {
  const [now, setNow] = useState<Date | null>(null)
  const { records } = useTimeRecords()
  const { profile } = useAuth()

  const name   = profile?.name   ?? 'User'
  const role   = profile?.role   ?? 'employee'
  const avatar = profile?.avatar ?? name.slice(0, 2).toUpperCase()

  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const todayRecord   = now ? records.find((r) => r.date === toDateStr(now)) : undefined
  const thisWeekTotal = records.filter((r) => r.duration !== null).reduce((sum, r) => sum + (r.duration ?? 0), 0)
  const timeStr = now ? now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '00:00:00'
  const dateStr = now ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '\u00a0'

  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      {/* User info */}
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            boxShadow: '0 0 20px rgba(79,70,229,0.45)',
          }}
        >
          {avatar}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white">{name}</h2>
          <p className="text-xs text-white/50 mt-0.5 capitalize">{role}</p>
          {profile?.department && (
            <p className="text-[11px] text-white/25 mt-0.5">{profile.department}</p>
          )}
        </div>

        {/* Status badge */}
        {todayRecord ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-green-400/10 border border-green-400/25 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-green-400">Clocked In</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-green-400/10 border border-green-400/25 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-semibold text-green-400">Online</span>
          </div>
        )}
      </div>

      {/* Live clock */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/7">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-white/30" />
          <span className="text-xs text-white/40">{dateStr}</span>
        </div>
        <span className="font-mono text-sm font-semibold text-white tabular-nums">{timeStr}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/4 border border-white/7">
          <div className="flex items-center gap-1.5 mb-1">
            <LogIn className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[11px] text-white/40">Today&apos;s Time In</span>
          </div>
          <p className="text-sm font-mono font-semibold text-white">
            {todayRecord ? todayRecord.timeIn : '—'}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/4 border border-white/7">
          <div className="flex items-center gap-1.5 mb-1">
            <Timer className="w-3.5 h-3.5 text-white/30" />
            <span className="text-[11px] text-white/40">Week Total</span>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#6366f1' }}>
            {formatDuration(thisWeekTotal)}
          </p>
        </div>
      </div>
    </div>
  )
}
