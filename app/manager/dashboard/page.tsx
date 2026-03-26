'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, Clock, TrendingUp, Zap,
  ArrowLeft, RefreshCw, CheckCircle2, Circle,
  UserPlus, X, Shield, User, ChevronDown, Loader2, Trash2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useOnlineIds } from '@/lib/presence-context'

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

type Member = {
  id: string
  name: string
  avatar: string
  role: 'manager' | 'employee'
  department: string | null
}

const ROLES: { value: 'manager' | 'employee'; label: string }[] = [
  { value: 'manager',  label: 'Manager'  },
  { value: 'employee', label: 'Employee' },
]

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
  const onlineIds   = useOnlineIds()
  const [summary,   setSummary]   = useState<Summary | null>(null)
  const [employees, setEmployees] = useState<EmployeeStat[]>([])
  const [loading,   setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [today, setToday] = useState('')

  // Members management state
  const [members,        setMembers]        = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [showInvite,     setShowInvite]     = useState(false)
  const [inviteForm,     setInviteForm]     = useState({ email: '', name: '', role: 'employee' as 'manager' | 'employee', department: '' })
  const [inviting,       setInviting]       = useState(false)
  const [inviteError,    setInviteError]    = useState('')
  const [inviteSuccess,  setInviteSuccess]  = useState(false)
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [savingRole,     setSavingRole]     = useState<string | null>(null)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)
  const [deletingId,     setDeletingId]     = useState<string | null>(null)

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
  }, [])

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

  const loadMembers = async () => {
    setMembersLoading(true)
    try {
      const res  = await fetch('/api/manager/members')
      const data = await res.json()
      setMembers(data.members ?? [])
    } finally {
      setMembersLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteError('')
    setInviteSuccess(false)
    try {
      const res  = await fetch('/api/manager/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const data = await res.json()
      if (!res.ok) { setInviteError(data.error ?? 'Something went wrong'); return }
      setInviteSuccess(true)
      setInviteForm({ email: '', name: '', role: 'employee', department: '' })
      loadMembers()
      setTimeout(() => { setShowInvite(false); setInviteSuccess(false) }, 2000)
    } finally {
      setInviting(false)
    }
  }

  const handleDelete = async (memberId: string) => {
    setDeletingId(memberId)
    setConfirmDelete(null)
    try {
      const res = await fetch('/api/manager/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId }),
      })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberId))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: 'manager' | 'employee') => {
    setSavingRole(memberId)
    setEditingId(null)
    try {
      const res  = await fetch('/api/manager/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, role: newRole }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      }
    } finally {
      setSavingRole(null)
    }
  }

  useEffect(() => {
    load()
    loadMembers()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  // Override DB online status with real-time presence
  const employeesWithPresence = employees.map((e) => ({ ...e, online: onlineIds.has(e.id) }))
  const totalOnlineNow = employeesWithPresence.filter((e) => e.online).length

  const statCards = summary
    ? [
        { label: 'Total Employees', value: summary.totalEmployees,      icon: Users,      color: '#6366f1' },
        { label: 'Online Now',      value: totalOnlineNow,              icon: Zap,        color: '#4ade80' },
        { label: 'Clocked In',      value: summary.totalClockedIn,      icon: Clock,      color: '#f59e0b' },
        { label: "Today's Hours",   value: fmt(summary.totalTodayMins), icon: TrendingUp, color: '#6366f1' },
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
            {lastRefresh ? `Refreshed ${lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}` : 'Loading…'}
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
            Real-time view of all employees · {today}
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
              {employeesWithPresence.map((emp) => (
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

        {/* Members management */}
        <div className="glass-card overflow-hidden">
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <h2 className="text-sm font-semibold text-white">Account Management</h2>
              <p className="text-xs text-white/30 mt-0.5">Manage roles and invite new members</p>
            </div>
            <button
              onClick={() => { setShowInvite(true); setInviteError(''); setInviteSuccess(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white transition-all"
              style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(99,102,241,0.4)' }}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Account
            </button>
          </div>

          {membersLoading ? (
            <div className="px-5 py-8 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-white/5" />
                    <div className="h-2.5 w-20 rounded bg-white/4" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-white/25 text-center py-10">No members found</p>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/2 transition-colors"
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{
                      background: member.role === 'manager'
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.5) 0%, rgba(167,139,250,0.3) 100%)'
                        : 'rgba(79,70,229,0.15)',
                      border: `1px solid ${member.role === 'manager' ? 'rgba(139,92,246,0.5)' : 'rgba(79,70,229,0.2)'}`,
                    }}
                  >
                    {member.avatar}
                  </div>

                  {/* Name + dept */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.name}</p>
                    <p className="text-xs text-white/35 truncate">{member.department ?? 'No department'}</p>
                  </div>

                  {/* Delete button */}
                  {member.id !== profile?.id && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {deletingId === member.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />
                      ) : confirmDelete === member.id ? (
                        <>
                          <span className="text-xs text-red-400/80">Remove?</span>
                          <button
                            onClick={() => handleDelete(member.id)}
                            className="px-2 py-0.5 rounded-lg text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15"
                            style={{ border: '1px solid rgba(239,68,68,0.3)' }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-0.5 rounded-lg text-xs font-medium text-white/40 transition-colors hover:bg-white/8"
                            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setConfirmDelete(member.id); setEditingId(null) }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Role badge / edit dropdown */}
                  <div className="relative flex-shrink-0">
                    {savingRole === member.id ? (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving…
                      </div>
                    ) : member.id === profile?.id ? (
                      // Can't edit own role
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: member.role === 'manager' ? 'rgba(139,92,246,0.15)' : 'rgba(79,70,229,0.12)',
                          color:      member.role === 'manager' ? '#a78bfa' : '#818cf8',
                          border:     `1px solid ${member.role === 'manager' ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.25)'}`,
                        }}
                      >
                        {member.role === 'manager' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {member.role === 'manager' ? 'Manager' : 'Employee'}
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingId(editingId === member.id ? null : member.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                        style={{
                          background: member.role === 'manager' ? 'rgba(139,92,246,0.15)' : 'rgba(79,70,229,0.12)',
                          color:      member.role === 'manager' ? '#a78bfa' : '#818cf8',
                          border:     `1px solid ${member.role === 'manager' ? 'rgba(139,92,246,0.3)' : 'rgba(99,102,241,0.25)'}`,
                        }}
                      >
                        {member.role === 'manager' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {member.role === 'manager' ? 'Manager' : 'Employee'}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </button>
                    )}

                    {/* Role dropdown */}
                    {editingId === member.id && (
                      <div
                        className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden py-1 min-w-[120px]"
                        style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                      >
                        {ROLES.map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => handleRoleChange(member.id, value)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-white/6"
                            style={{ color: member.role === value ? '#818cf8' : 'rgba(255,255,255,0.6)' }}
                          >
                            {value === 'manager' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                            {label}
                            {member.role === value && <span className="ml-auto text-[10px] opacity-50">current</span>}
                          </button>
                        ))}
                      </div>
                    )}
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

      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false) }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">Invite New Member</h3>
                <p className="text-xs text-white/35 mt-0.5">They'll receive an email to set their password</p>
              </div>
              <button
                onClick={() => setShowInvite(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/8 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteSuccess ? (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Invite sent! The member will receive an email shortly.
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                {inviteError && (
                  <div
                    className="px-3 py-2.5 rounded-xl text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
                  >
                    {inviteError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Full name</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Smith"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:ring-1"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', focusRingColor: '#6366f1' } as React.CSSProperties}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/50 mb-1.5">Email address</label>
                    <input
                      required
                      type="email"
                      placeholder="jane@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:ring-1"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Role</label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value as 'manager' | 'employee' }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-1"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. Engineering"
                        value={inviteForm.department}
                        onChange={(e) => setInviteForm(f => ({ ...f, department: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none focus:ring-1"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}
                >
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
