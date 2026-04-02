'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Users, RefreshCw, Activity,
  LogIn, LogOut, Timer, Wifi,
} from 'lucide-react'
import { useOnlineIds } from '@/lib/presence-context'
import { createClient } from '@/lib/supabase/client'
import AvatarImage from '@/components/AvatarImage'

type MemberRecord = {
  id: string
  name: string
  avatar: string
  department: string | null
  online: boolean
  lastSeen: string | null
  isClockedIn: boolean
  timeIn: string | null
  timeOut: string | null
  durationMins: number | null
}

type HourlyPoint = {
  label: string
  totalMins: number
  totalHours: number
}

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function buildHourlyData(members: MemberRecord[]): HourlyPoint[] {
  const nowMins = nowMinutes()
  const buckets = new Array(24).fill(0)

  for (const m of members) {
    if (!m.timeIn) continue
    const start = parseHHMM(m.timeIn)
    const end   = m.timeOut ? parseHHMM(m.timeOut) : nowMins

    for (let h = 0; h < 24; h++) {
      const hStart = h * 60
      const hEnd   = hStart + 60
      const overlap = Math.max(0, Math.min(end, hEnd) - Math.max(start, hStart))
      buckets[h] += overlap
    }
  }

  return buckets
    .map((mins, h) => ({
      label:      `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`,
      totalMins:  mins,
      totalHours: Math.round((mins / 60) * 10) / 10,
    }))
    .filter((_, h) => h >= 6 && h <= 21)
}

function fmtDuration(mins: number): string {
  if (mins < 1) return '< 1m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${display}:${String(m).padStart(2, '0')} ${period}`
}

function LiveDuration({ timeIn }: { timeIn: string }) {
  const [mins, setMins] = useState(() => {
    const start = parseHHMM(timeIn)
    return Math.max(0, nowMinutes() - start)
  })

  useEffect(() => {
    const tick = () => {
      const start = parseHHMM(timeIn)
      setMins(Math.max(0, nowMinutes() - start))
    }
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [timeIn])

  return <span className="font-mono text-emerald-400">{fmtDuration(mins)}</span>
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const hrs = payload[0].value
  return (
    <div
      className="px-3 py-2 rounded-xl text-sm"
      style={{
        background: 'rgba(15,15,25,0.95)',
        border: '1px solid rgba(99,102,241,0.3)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="text-white/60 text-xs mb-0.5">{label}</p>
      <p className="font-semibold text-indigo-300">
        {hrs > 0 ? `${hrs}h team effort` : 'No activity'}
      </p>
    </div>
  )
}

export default function MonitoringPage() {
  const onlineIds  = useOnlineIds()
  const [members,  setMembers]  = useState<MemberRecord[]>([])
  const [loading,  setLoading]  = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [tick,     setTick]     = useState(0)

  const membersRef = useRef<MemberRecord[]>([])

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/manager/monitoring')
    if (!res.ok) return
    const json = await res.json()
    membersRef.current = json.members ?? []
    setMembers(json.members ?? [])
    setLastSync(new Date())
    setLoading(false)
  }, [])

  // Initial fetch
  useEffect(() => { fetchData() }, [fetchData])

  // Real-time: time_records changes (clock in / clock out)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('monitoring-time-records')
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'time_records',
      }, (payload: any) => {
        const { user_id, time_in, time_out, duration } = payload.new
        setMembers((prev) => {
          const next = prev.map((m) =>
            m.id === user_id
              ? { ...m, isClockedIn: time_out === null, timeIn: time_in, timeOut: time_out ?? null, durationMins: duration ?? null }
              : m
          )
          membersRef.current = next
          return next
        })
        setLastSync(new Date())
      })
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'time_records',
      }, (payload: any) => {
        const { user_id, time_in, time_out, duration } = payload.new
        setMembers((prev) => {
          const next = prev.map((m) =>
            m.id === user_id
              ? { ...m, isClockedIn: time_out === null, timeIn: time_in, timeOut: time_out ?? null, durationMins: duration ?? null }
              : m
          )
          membersRef.current = next
          return next
        })
        setLastSync(new Date())
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Real-time: profile online status changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('monitoring-profiles')
      .on('postgres_changes' as any, {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload: any) => {
        const { id, online, last_seen } = payload.new
        setMembers((prev) => {
          const next = prev.map((m) =>
            m.id === id ? { ...m, online: online ?? false, lastSeen: last_seen ?? null } : m
          )
          membersRef.current = next
          return next
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Re-compute chart every minute so active sessions advance
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Merge real-time presence with fetched data
  const enriched = members.map((m) => ({
    ...m,
    online: onlineIds.has(m.id),
  }))

  const totalOnline    = enriched.filter((m) => m.online).length
  const totalClockedIn = enriched.filter((m) => m.isClockedIn).length
  const totalTodayMins = enriched.reduce((sum, m) => {
    if (!m.timeIn) return sum
    const start = parseHHMM(m.timeIn)
    const end   = m.timeOut ? parseHHMM(m.timeOut) : nowMinutes()
    return sum + Math.max(0, end - start)
  }, 0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hourlyData = buildHourlyData(enriched)

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/40">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading monitor…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            Team Monitor
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Live attendance &amp; productivity for today
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-white/30 text-xs hidden sm:block">
              Updated {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchData}
            className="p-2 rounded-xl text-white/40 hover:text-white transition-colors"
            style={glass}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users,   label: 'Total Members',   value: enriched.length,   color: '#818cf8' },
          { icon: Wifi,    label: 'Online Now',       value: totalOnline,       color: '#34d399' },
          { icon: LogIn,   label: 'Clocked In',       value: totalClockedIn,    color: '#60a5fa' },
          { icon: Timer,   label: 'Team Hours Today', value: fmtDuration(totalTodayMins), color: '#f472b6' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ ...glass, padding: '14px 18px' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              <span className="text-white/40 text-xs">{label}</span>
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Productivity chart */}
      <div style={{ ...glass, padding: '20px 24px' }}>
        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Daily Productivity</p>
            <p className="text-white/40 text-xs">Team's combined hours worked per hour of the day</p>
          </div>
        </div>

        {hourlyData.every((d) => d.totalHours === 0) ? (
          <div className="h-40 flex items-center justify-center text-white/30 text-sm">
            No clock-ins recorded today yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="totalHours"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#prodGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Member list */}
      <div style={glass}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-white text-sm font-semibold">
            Team Members
            <span className="ml-2 text-white/30 font-normal text-xs">
              {enriched.length} total
            </span>
          </p>
        </div>

        {enriched.length === 0 ? (
          <div className="py-12 text-center text-white/30 text-sm">
            No team members found
          </div>
        ) : (
          <div className="overflow-x-auto">
          <div className="divide-y divide-white/[0.04] min-w-[600px]">
            {/* Column headers */}
            <div
              className="grid px-5 py-2.5 text-xs text-white/25 uppercase tracking-wider"
              style={{ gridTemplateColumns: '1fr 100px 110px 90px 90px 90px' }}
            >
              <span>Member</span>
              <span>Status</span>
              <span>Clock</span>
              <span>Time In</span>
              <span>Time Out</span>
              <span>Duration</span>
            </div>

            {enriched.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member: m }: { member: MemberRecord }) {
  return (
    <div
      className="grid items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      style={{ gridTemplateColumns: '1fr 100px 110px 90px 90px 90px' }}
    >
      {/* Member identity */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.2)',
            color: '#818cf8',
          }}
        >
          <AvatarImage src={m.avatar} alt={m.name} fallback={m.name?.slice(0, 2).toUpperCase()} />
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{m.name}</p>
          {m.department && (
            <p className="text-white/35 text-xs truncate">{m.department}</p>
          )}
        </div>
      </div>

      {/* Online status */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            background:  m.online ? '#34d399' : 'rgba(255,255,255,0.15)',
            boxShadow:   m.online ? '0 0 6px rgba(52,211,153,0.6)' : 'none',
          }}
        />
        <span
          className="text-xs"
          style={{ color: m.online ? '#34d399' : 'rgba(255,255,255,0.3)' }}
        >
          {m.online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Clock status */}
      <div>
        {m.isClockedIn ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <LogIn className="w-3 h-3" />
            Clocked In
          </span>
        ) : m.timeIn ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
            style={{ background: 'rgba(148,163,184,0.08)', color: 'rgba(148,163,184,0.6)', border: '1px solid rgba(148,163,184,0.1)' }}
          >
            <LogOut className="w-3 h-3" />
            Clocked Out
          </span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </div>

      {/* Time In */}
      <div className="text-sm">
        {m.timeIn ? (
          <span className="text-white/70 font-mono text-xs">{fmtTime(m.timeIn)}</span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </div>

      {/* Time Out */}
      <div className="text-sm">
        {m.timeOut ? (
          <span className="text-white/70 font-mono text-xs">{fmtTime(m.timeOut)}</span>
        ) : m.timeIn ? (
          <span className="text-emerald-500/60 text-xs italic">Active</span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </div>

      {/* Duration */}
      <div className="text-sm">
        {m.isClockedIn && m.timeIn ? (
          <LiveDuration timeIn={m.timeIn} />
        ) : m.durationMins != null ? (
          <span className="text-white/60 font-mono text-xs">{fmtDuration(m.durationMins)}</span>
        ) : (
          <span className="text-white/20 text-xs">—</span>
        )}
      </div>
    </div>
  )
}
