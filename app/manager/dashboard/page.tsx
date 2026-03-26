'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Clock, TrendingUp, Zap, ChevronRight,
  ArrowLeft, RefreshCw, CheckCircle2, Circle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

type EmployeeStat = {
  id: string
  name: string
  avatar: string
  department: string | null
  online: boolean
  lastSeen: string | null
  isClockedIn: boolean
  timeIn: string | null
  timeOut: string | null
  todayMins: number | null
  weekMins: number
}

type Summary = {
  totalEmployees: number
  totalOnline: number
  totalClockedIn: number
  totalTodayMins: number
  totalWeekMins: number
}

function fmt(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function ManagerDashboard() {
  const { profile } = useAuth()
  const [summary,   setSummary]   = useState<Summary | null>(null)
  const [employees, setEmployees] = useState<EmployeeStat[]>([])
  const [loading,   setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/manager/stats')
      const data = await res.json()
      setSummary(data.summary)
      setEmployees(data.employees)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const statCards = summary
    ? [
        { label: 'Total Employees', value: summary.totalEmployees,         icon: Users,     color: '#6366f1' },
        { label: 'Online Now',      value: summary.totalOnline,            icon: Zap,       color: '#4ade80' },
        { label: 'Clocked In',      value: summary.totalClockedIn,        icon: Clock,     color: '#f59e0b' },
        { label: "Today's Hours",   value: fmt(summary.totalTodayMins),    icon: TrendingUp, color: '#6366f1' },
      ]
    : []

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between"
        style={{
          background:    'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(24px)',
          borderColor:   'rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Employee view
          </Link>
          <span className="text-white/15">·</span>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)' }}
            >
              <Zap className="w-3 h-3" style={{ color: '#6366f1' }} fill="currentColor" />
            </div>
            <span className="text-sm font-bold tracking-widest text-white">
              B<span style={{ color: '#6366f1' }}>O</span>LT
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(79,70,229,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              Manager
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/25 hidden sm:block">
            Refreshed {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 10px rgba(79,70,229,0.4)' }}
          >
            {profile?.avatar ?? 'M'}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Team Overview</h1>
          <p className="text-sm text-white/35 mt-0.5">
            Real-time view of all employees · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {loading && !summary
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="h-3 w-20 rounded bg-white/5 mb-3" />
                  <div className="h-7 w-12 rounded bg-white/8" />
                </div>
              ))
            : statCards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs text-white/40">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                </div>
              ))}
        </div>

        {/* Employee table */}
        <div className="glass-card overflow-hidden">
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="text-sm font-semibold text-white">Employees</h2>
            <span className="text-xs text-white/30">{employees.length} members</span>
          </div>

          {loading && employees.length === 0 ? (
            <div className="px-5 py-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-white/5" />
                    <div className="h-2.5 w-20 rounded bg-white/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-white/25 text-center py-10">No employees found</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors"
                >
                  {/* Avatar + status dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{
                        background: emp.isClockedIn
                          ? 'linear-gradient(135deg, rgba(79,70,229,0.5) 0%, rgba(99,102,241,0.4) 100%)'
                          : 'rgba(79,70,229,0.15)',
                        border: `1px solid ${emp.isClockedIn ? 'rgba(99,102,241,0.5)' : 'rgba(79,70,229,0.2)'}`,
                      }}
                    >
                      {emp.avatar}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                      style={{
                        background:  emp.online ? '#4ade80' : 'rgba(255,255,255,0.15)',
                        borderColor: '#0a0a0f',
                      }}
                    />
                  </div>

                  {/* Name + dept */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{emp.name}</p>
                    <p className="text-xs text-white/35 truncate">
                      {emp.department ?? 'No department'}
                      {!emp.online && emp.lastSeen && (
                        <> · <span className="text-white/25">last seen {emp.lastSeen}</span></>
                      )}
                    </p>
                  </div>

                  {/* Clock status */}
                  <div className="flex items-center gap-1.5 min-w-[90px]">
                    {emp.isClockedIn ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        <span className="text-xs text-green-400 font-medium">
                          In since {emp.timeIn}
                        </span>
                      </>
                    ) : emp.timeIn ? (
                      <>
                        <Circle className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                        <span className="text-xs text-white/35">
                          {emp.timeIn} – {emp.timeOut}
                        </span>
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5 text-white/15 flex-shrink-0" />
                        <span className="text-xs text-white/25">Not clocked in</span>
                      </>
                    )}
                  </div>

                  {/* Hours today */}
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs font-semibold text-white">
                      {emp.todayMins !== null ? fmt(emp.todayMins) : emp.isClockedIn ? '—' : '0h'}
                    </p>
                    <p className="text-[10px] text-white/25">today</p>
                  </div>

                  {/* Hours this week */}
                  <div className="text-right min-w-[70px]">
                    <p className="text-xs font-semibold" style={{ color: '#818cf8' }}>
                      {fmt(emp.weekMins)}
                    </p>
                    <p className="text-[10px] text-white/25">this week</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-[11px] text-white/20 text-center">
          Data updates on refresh · Clocked-in hours shown after clock-out
        </p>
      </div>
    </div>
  )
}
