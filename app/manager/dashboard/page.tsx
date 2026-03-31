'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Users, Clock, TrendingUp, Zap, ArrowLeft, RefreshCw,
  CheckCircle2, UserPlus, X, Shield, User, ChevronDown,
  Loader2, Trash2, CalendarDays, Pencil, Check,
  LogIn, LogOut, Timer, Activity, Briefcase,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useOnlineIds } from '@/lib/presence-context'
import { createClient } from '@/lib/supabase/client'
import AvatarImage from '@/components/AvatarImage'

/* ─── Types ─────────────────────────────────────────────────────────── */

type MergedMember = {
  // admin
  id: string
  name: string
  avatar: string
  role: 'manager' | 'member'
  department: string | null
  status?: 'pending' | 'joined'
  // attendance (real-time)
  online: boolean
  lastSeen: string | null
  isClockedIn: boolean
  timeIn: string | null
  timeOut: string | null
  durationMins: number | null
}

type Summary = {
  totalEmployees: number
  totalOnline: number
  totalClockedIn: number
  totalTodayMins: number
  totalWeekMins: number
}

type HourlyPoint = { label: string; totalHours: number }

/* ─── Helpers ────────────────────────────────────────────────────────── */

function fmt(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function parseHHMM(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nowMins() {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const p = h < 12 ? 'AM' : 'PM'
  const d = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${d}:${String(m).padStart(2, '0')} ${p}`
}

function fmtDur(mins: number) {
  if (mins < 1) return '< 1m'
  const h = Math.floor(mins / 60), m = mins % 60
  return h === 0 ? `${m}m` : m > 0 ? `${h}h ${m}m` : `${h}h`
}

function buildChart(members: MergedMember[]): HourlyPoint[] {
  const now = nowMins()
  const buckets = new Array(24).fill(0)
  for (const m of members) {
    if (!m.timeIn) continue
    const start = parseHHMM(m.timeIn)
    const end   = m.timeOut ? parseHHMM(m.timeOut) : now
    for (let h = 0; h < 24; h++) {
      buckets[h] += Math.max(0, Math.min(end, (h + 1) * 60) - Math.max(start, h * 60))
    }
  }
  return buckets
    .map((mins, h) => ({
      label:      `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`,
      totalHours: Math.round((mins / 60) * 10) / 10,
    }))
    .filter((_, h) => h >= 6 && h <= 21)
}

/* ─── Sub-components ────────────────────────────────────────────────── */

function LiveDuration({ timeIn }: { timeIn: string }) {
  const [mins, setMins] = useState(() => Math.max(0, nowMins() - parseHHMM(timeIn)))
  useEffect(() => {
    const id = setInterval(() => setMins(Math.max(0, nowMins() - parseHHMM(timeIn))), 60_000)
    return () => clearInterval(id)
  }, [timeIn])
  return <span className="font-mono text-emerald-400 text-xs">{fmtDur(mins)}</span>
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-sm"
      style={{ background: 'rgba(15,15,25,0.95)', border: '1px solid rgba(99,102,241,0.3)', backdropFilter: 'blur(12px)' }}>
      <p className="text-white/60 text-xs mb-0.5">{label}</p>
      <p className="font-semibold text-indigo-300">
        {(payload[0].value ?? 0) > 0 ? `${payload[0].value}h team effort` : 'No activity'}
      </p>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────────────────── */

const AUTH_ROLES: { value: 'manager' | 'member'; label: string }[] = [
  { value: 'manager', label: 'Manager' },
  { value: 'member',  label: 'Member'  },
]

export default function ManagerDashboard() {
  const { profile } = useAuth()
  const onlineIds   = useOnlineIds()

  const [summary,      setSummary]      = useState<Summary | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [members,      setMembers]      = useState<MergedMember[]>([])
  const [dataLoading,  setDataLoading]  = useState(true)
  const [lastRefresh,  setLastRefresh]  = useState<Date | null>(null)
  const [today,        setToday]        = useState('')
  const [chartTick,    setChartTick]    = useState(0)

  // Team name
  const [teamName,      setTeamName]      = useState<string | null>(null)
  const [editingTeam,   setEditingTeam]   = useState(false)
  const [teamNameInput, setTeamNameInput] = useState('')
  const [savingTeam,    setSavingTeam]    = useState(false)

  // Invite
  const [showInvite,    setShowInvite]    = useState(false)
  const [inviteForm,    setInviteForm]    = useState({ email: '', name: '', role: 'member' as 'manager' | 'member', department: '' })
  const [inviting,      setInviting]      = useState(false)
  const [inviteError,   setInviteError]   = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)

  // Auth role edit
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [savingRole,    setSavingRole]    = useState<string | null>(null)

  // Department edit
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null)
  const [deptInput,     setDeptInput]     = useState('')
  const [savingDept,    setSavingDept]    = useState<string | null>(null)

  const membersRef = useRef<MergedMember[]>([])

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

  /* ── Data loading ─────────────────────────────────── */

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch('/api/manager/stats')
      const d   = await res.json()
      setSummary(d.summary ?? null)
      setLastRefresh(new Date())
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadMembers = useCallback(async () => {
    setDataLoading(true)
    try {
      const [adminRes, monRes] = await Promise.all([
        fetch('/api/manager/members'),
        fetch('/api/manager/monitoring'),
      ])
      const adminData = await adminRes.json()
      const monData   = await monRes.json()

      const timeMap = new Map<string, {
        online: boolean; lastSeen: string | null
        isClockedIn: boolean; timeIn: string | null
        timeOut: string | null; durationMins: number | null
      }>()
      for (const m of (monData.members ?? [])) {
        timeMap.set(m.id, {
          online: m.online, lastSeen: m.lastSeen,
          isClockedIn: m.isClockedIn, timeIn: m.timeIn,
          timeOut: m.timeOut, durationMins: m.durationMins,
        })
      }

      const merged: MergedMember[] = (adminData.members ?? []).map((m: MergedMember) => ({
        ...m,
        ...(timeMap.get(m.id) ?? {
          online: false, lastSeen: null,
          isClockedIn: false, timeIn: null, timeOut: null, durationMins: null,
        }),
      }))

      membersRef.current = merged
      setMembers(merged)
    } finally {
      setDataLoading(false)
    }
  }, [])

  const loadTeamName = useCallback(async () => {
    const res = await fetch('/api/team/name')
    const d   = await res.json()
    setTeamName(d.name ?? null)
  }, [])

  useEffect(() => {
    loadStats()
    loadMembers()
    loadTeamName()
    const statsId = setInterval(loadStats, 30_000)
    const chartId = setInterval(() => setChartTick((t) => t + 1), 60_000)
    return () => { clearInterval(statsId); clearInterval(chartId) }
  }, [loadStats, loadMembers, loadTeamName])

  /* ── Real-time subscriptions ──────────────────────── */

  // Re-fetch only the time-tracking slice when any clock event fires.
  // We do a fresh API call instead of patching from the event payload because
  // Supabase UPDATE events omit unchanged columns (e.g. user_id) unless the
  // table has REPLICA IDENTITY FULL — making direct payload patching unreliable.
  const refetchTimeData = useCallback(async () => {
    const res = await fetch('/api/manager/monitoring')
    if (!res.ok) return
    const json = await res.json()
    const timeMap = new Map((json.members ?? []).map((m: any) => [m.id, m]))
    setMembers((prev) => {
      const next = prev.map((m) => {
        const fresh = timeMap.get(m.id) as any
        if (!fresh) return m
        return {
          ...m,
          isClockedIn:  fresh.isClockedIn,
          timeIn:       fresh.timeIn,
          timeOut:      fresh.timeOut,
          durationMins: fresh.durationMins,
        }
      })
      membersRef.current = next
      return next
    })
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel('dashboard-time-records')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'time_records' }, () => refetchTimeData())
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'time_records' }, () => refetchTimeData())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [refetchTimeData])

  /* ── Merge real-time presence ─────────────────────── */
  const enriched = members.map((m) => ({ ...m, online: onlineIds.has(m.id) }))

  /* ── Chart data ───────────────────────────────────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const chartData = buildChart(enriched)

  /* ── Computed totals ──────────────────────────────── */
  const totalOnline    = enriched.filter((m) => m.online).length
  const totalClockedIn = enriched.filter((m) => m.isClockedIn).length
  const totalTodayMins = enriched.reduce((sum, m) => {
    if (!m.timeIn) return sum
    return sum + Math.max(0, (m.timeOut ? parseHHMM(m.timeOut) : nowMins()) - parseHHMM(m.timeIn))
  }, 0)

  const statCards = [
    { label: 'Total Members', value: summary?.totalEmployees ?? enriched.length, icon: Users,      color: '#6366f1' },
    { label: 'Online Now',    value: totalOnline,                                 icon: Zap,        color: '#4ade80' },
    { label: 'Clocked In',    value: totalClockedIn,                              icon: Clock,      color: '#f59e0b' },
    { label: "Today's Hours", value: fmt(totalTodayMins),                         icon: TrendingUp, color: '#6366f1' },
  ]

  /* ── Handlers ─────────────────────────────────────── */

  const saveTeamName = async () => {
    if (!teamNameInput.trim()) return
    setSavingTeam(true)
    try {
      const res = await fetch('/api/team/name', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamNameInput.trim() }),
      })
      if (res.ok) { setTeamName(teamNameInput.trim()); setEditingTeam(false) }
    } finally { setSavingTeam(false) }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true); setInviteError(''); setInviteSuccess(false)
    try {
      const res  = await fetch('/api/manager/invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? 'Something went wrong'); return }
      setInviteSuccess(true)
      setInviteForm({ email: '', name: '', role: 'member', department: '' })
      loadMembers()
      setTimeout(() => { setShowInvite(false); setInviteSuccess(false) }, 2000)
    } finally { setInviting(false) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id); setConfirmDelete(null)
    try {
      const res = await fetch('/api/manager/members', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id))
    } finally { setDeletingId(null) }
  }

  const handleRoleChange = async (id: string, role: 'manager' | 'member') => {
    setSavingRole(id); setEditingRoleId(null)
    try {
      const res = await fetch('/api/manager/members', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      })
      if (res.ok) setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m))
    } finally { setSavingRole(null) }
  }

  const saveDept = async (id: string) => {
    setSavingDept(id); setEditingDeptId(null)
    try {
      const res = await fetch('/api/manager/members', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, department: deptInput.trim() }),
      })
      if (res.ok) setMembers((prev) => prev.map((m) => m.id === id ? { ...m, department: deptInput.trim() || null } : m))
    } finally { setSavingDept(null) }
  }

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16,
  }

  /* ─── Render ─────────────────────────────────────── */

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>

      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(24px)', borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />Member view
          </Link>
          <span className="text-white/15">·</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.4)' }}>
              <Zap className="w-3 h-3" style={{ color: '#6366f1' }} fill="currentColor" />
            </div>
            <span className="text-sm font-bold tracking-widest text-white">B<span style={{ color: '#6366f1' }}>O</span>LT</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(79,70,229,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
              Manager
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/25 hidden sm:block">
            {lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`
              : 'Loading…'}
          </span>
          <Link href="/manager/schedules"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <CalendarDays className="w-3.5 h-3.5" />Schedules
          </Link>
          <button onClick={() => { loadStats(); loadMembers() }} disabled={statsLoading || dataLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/8 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${(statsLoading || dataLoading) ? 'animate-spin' : ''}`} />Refresh
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
            style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 10px rgba(79,70,229,0.4)' }}>
            <AvatarImage src={profile?.avatar} alt={profile?.name ?? ''} fallback={profile?.name?.slice(0, 1) ?? 'M'} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Title + team name */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Overview</h1>
            <p className="text-sm text-white/35 mt-0.5">Live attendance &amp; team management · {today}</p>
          </div>
          <div className="flex items-center gap-2">
            {editingTeam ? (
              <>
                <input autoFocus value={teamNameInput}
                  onChange={(e) => setTeamNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') setEditingTeam(false) }}
                  className="px-3 py-1.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(99,102,241,0.5)', minWidth: 160 }}
                  maxLength={100} />
                <button onClick={saveTeamName} disabled={savingTeam}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-400 hover:bg-indigo-500/15 transition-all disabled:opacity-50">
                  {savingTeam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setEditingTeam(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/8 transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button onClick={() => { setTeamNameInput(teamName ?? ''); setEditingTeam(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/6 transition-all group"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <span>{teamName ?? 'Name your team'}</span>
                <Pencil className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(statsLoading && !summary)
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

        {/* Productivity chart */}
        <div style={{ ...glass, padding: '20px 24px' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Daily Productivity</p>
              <p className="text-white/40 text-xs">Team's combined hours worked per hour of the day</p>
            </div>
          </div>
          {chartData.every((d) => d.totalHours === 0) ? (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm">
              No clock-ins recorded today yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="totalHours" stroke="#6366f1" strokeWidth={2}
                  fill="url(#prodGrad)" dot={false} activeDot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team Members — single unified list */}
        <div style={glass} className="overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div>
              <h2 className="text-sm font-semibold text-white">Team Members</h2>
              <p className="text-xs text-white/30 mt-0.5">Live attendance · edit positions &amp; roles</p>
            </div>
            <button
              onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all"
              style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(99,102,241,0.4)' }}>
              <UserPlus className="w-3.5 h-3.5" />Add Account
            </button>
          </div>

          {dataLoading ? (
            <div className="px-5 py-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-white/5" />
                    <div className="h-2.5 w-20 rounded bg-white/4" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-white/5" />
                  <div className="h-5 w-16 rounded-full bg-white/4" />
                </div>
              ))}
            </div>
          ) : enriched.length === 0 ? (
            <p className="text-sm text-white/25 text-center py-10">No members yet — invite your team above</p>
          ) : (
            <div className="overflow-x-auto">
              {/* Column headers */}
              <div className="grid items-center px-5 py-2.5 text-[10px] text-white/25 uppercase tracking-wider min-w-[860px]"
                style={{ gridTemplateColumns: '1fr 90px 110px 80px 80px 80px 110px auto' }}>
                <span>Member &amp; Position</span>
                <span>Status</span>
                <span>Clock</span>
                <span>Time In</span>
                <span>Time Out</span>
                <span>Duration</span>
                <span>Role</span>
                <span />
              </div>

              <div className="divide-y divide-white/[0.04] min-w-[860px]">
                {enriched.map((member) => (
                  <div key={member.id}
                    className="grid items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
                    style={{ gridTemplateColumns: '1fr 90px 110px 80px 80px 80px 110px auto' }}>

                    {/* Member identity + editable position */}
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                        style={{
                          background: member.role === 'manager'
                            ? 'linear-gradient(135deg, rgba(139,92,246,0.5) 0%, rgba(167,139,250,0.3) 100%)'
                            : member.isClockedIn
                              ? 'linear-gradient(135deg, rgba(79,70,229,0.5) 0%, rgba(99,102,241,0.4) 100%)'
                              : 'rgba(79,70,229,0.15)',
                          border: `1px solid ${member.role === 'manager' ? 'rgba(139,92,246,0.5)' : member.isClockedIn ? 'rgba(99,102,241,0.5)' : 'rgba(79,70,229,0.2)'}`,
                        }}>
                        <AvatarImage src={member.avatar} alt={member.name} fallback={member.name?.slice(0, 2).toUpperCase() ?? '??'} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-white truncate">{member.name}</p>
                          {member.status === 'pending' && (
                            <span className="flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                              Pending
                            </span>
                          )}
                        </div>
                        {/* Department inline edit */}
                        {editingDeptId === member.id ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <input autoFocus value={deptInput}
                              onChange={(e) => setDeptInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveDept(member.id); if (e.key === 'Escape') setEditingDeptId(null) }}
                              placeholder="e.g. Front End…" maxLength={80}
                              className="px-2 py-0.5 rounded-md text-xs text-white placeholder-white/25 outline-none min-w-0 flex-1"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.4)' }} />
                            <button onClick={() => saveDept(member.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-indigo-400 hover:bg-indigo-500/15 flex-shrink-0">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingDeptId(null)}
                              className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:bg-white/8 flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : savingDept === member.id ? (
                          <div className="flex items-center gap-1 mt-0.5 text-white/30 text-xs">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />Saving…
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingDeptId(member.id); setDeptInput(member.department ?? ''); setEditingRoleId(null); setConfirmDelete(null) }}
                            className="flex items-center gap-1 mt-0.5 group max-w-full">
                            <Briefcase className="w-2.5 h-2.5 text-white/20 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                            <span className="text-xs text-white/35 group-hover:text-white/60 transition-colors truncate">
                              {member.department ?? 'Set position…'}
                            </span>
                            <Pencil className="w-2 h-2 text-white/0 group-hover:text-white/25 transition-colors flex-shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Online status */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          background: member.online ? '#34d399' : 'rgba(255,255,255,0.15)',
                          boxShadow:  member.online ? '0 0 6px rgba(52,211,153,0.6)' : 'none',
                        }} />
                      <span className="text-xs" style={{ color: member.online ? '#34d399' : 'rgba(255,255,255,0.3)' }}>
                        {member.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {/* Clock status */}
                    <div>
                      {member.isClockedIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                          <LogIn className="w-3 h-3" />Clocked In
                        </span>
                      ) : member.timeIn ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                          style={{ background: 'rgba(148,163,184,0.08)', color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(148,163,184,0.1)' }}>
                          <LogOut className="w-3 h-3" />Clocked Out
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </div>

                    {/* Time In */}
                    <div>
                      {member.timeIn
                        ? <span className="text-white/60 font-mono text-xs">{fmtTime(member.timeIn)}</span>
                        : <span className="text-white/20 text-xs">—</span>}
                    </div>

                    {/* Time Out */}
                    <div>
                      {member.timeOut
                        ? <span className="text-white/60 font-mono text-xs">{fmtTime(member.timeOut)}</span>
                        : member.timeIn
                          ? <span className="text-emerald-500/60 text-xs italic">Active</span>
                          : <span className="text-white/20 text-xs">—</span>}
                    </div>

                    {/* Duration */}
                    <div>
                      {member.isClockedIn && member.timeIn
                        ? <LiveDuration timeIn={member.timeIn} />
                        : member.durationMins != null
                          ? <span className="text-white/55 font-mono text-xs">{fmtDur(member.durationMins)}</span>
                          : <span className="text-white/20 text-xs">—</span>}
                    </div>

                    {/* Auth role */}
                    <div className="relative">
                      {savingRole === member.id ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                          <Loader2 className="w-3 h-3 animate-spin" />Saving…
                        </div>
                      ) : member.id === profile?.id ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                            border: '1px solid rgba(139,92,246,0.3)',
                          }}>
                          <Shield className="w-3 h-3" />Manager
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingRoleId(editingRoleId === member.id ? null : member.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                          style={{
                            background: member.role === 'manager' ? 'rgba(139,92,246,0.15)' : 'rgba(79,70,229,0.12)',
                            color:      member.role === 'manager' ? '#a78bfa' : '#818cf8',
                            border:     `1px solid ${member.role === 'manager' ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.25)'}`,
                          }}>
                          {member.role === 'manager' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {member.role === 'manager' ? 'Manager' : 'Member'}
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>
                      )}
                      {editingRoleId === member.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden py-1 min-w-[120px]"
                          style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                          {AUTH_ROLES.map(({ value, label }) => (
                            <button key={value} onClick={() => handleRoleChange(member.id, value)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-white/6"
                              style={{ color: member.role === value ? '#818cf8' : 'rgba(255,255,255,0.6)' }}>
                              {value === 'manager' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                              {label}
                              {member.role === value && <span className="ml-auto text-[10px] opacity-50">current</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <div className="flex items-center gap-1.5 pl-2">
                      {member.id === profile?.id ? <div className="w-7" /> :
                        deletingId === member.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />
                        ) : confirmDelete === member.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-red-400/80">Remove?</span>
                            <button onClick={() => handleDelete(member.id)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-red-400 hover:bg-red-500/15 transition-colors"
                              style={{ border: '1px solid rgba(239,68,68,0.3)' }}>Yes</button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white/40 hover:bg-white/8 transition-colors"
                              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setConfirmDelete(member.id); setEditingRoleId(null); setEditingDeptId(null) }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-white/20 text-center">
          Attendance updates in real-time · Stats refresh every 30s
        </p>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Invite New Member</h3>
                <p className="text-xs text-white/35 mt-0.5">They'll receive an email to set their password</p>
              </div>
              <button onClick={() => setShowInvite(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Invite sent! The member will receive an email shortly.
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div className="px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
                    {inviteError}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Full name</label>
                    <input required type="text" placeholder="Jane Smith" value={inviteForm.name}
                      onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Email address</label>
                    <input required type="email" placeholder="jane@company.com" value={inviteForm.email}
                      onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Role</label>
                      <select value={inviteForm.role}
                        onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as 'manager' | 'member' }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Position</label>
                      <input type="text" placeholder="e.g. Front End" value={inviteForm.department}
                        onChange={(e) => setInviteForm((f) => ({ ...f, department: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={inviting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {inviting ? 'Sending invite…' : 'Send Invite'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
