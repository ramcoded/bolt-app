'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Zap, CalendarDays, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import ManagerScheduleEditor from '@/components/Timeline/ManagerScheduleEditor'
import AvatarImage from '@/components/AvatarImage'

type Member = {
  id: string
  name: string
  avatar: string
  role: 'manager' | 'employee'
  department: string | null
}

export default function SchedulesPage() {
  const { profile } = useAuth()
  const [members,  setMembers]  = useState<Member[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Member | null>(null)

  useEffect(() => {
    fetch('/api/manager/members')
      .then((r) => r.json())
      .then((d) => {
        const list: Member[] = d.members ?? []
        setMembers(list)
        // Pre-select the logged-in manager
        const self = list.find((m) => m.id === profile?.id)
        if (self) setSelected(self)
      })
      .finally(() => setLoading(false))
  }, [profile?.id])

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 border-b px-6 py-4 flex items-center justify-between"
        style={{
          background:     'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(24px)',
          borderColor:    'rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/manager/dashboard"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
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

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
          style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 10px rgba(79,70,229,0.4)' }}
        >
          <AvatarImage src={profile?.avatar} alt={profile?.name ?? ''} fallback={profile?.name?.slice(0,1) ?? 'M'} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6" style={{ color: '#6366f1' }} />
            Schedules
          </h1>
          <p className="text-sm text-white/35 mt-0.5">
            Assign and manage weekly schedules for all team members
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Member list */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="glass-card overflow-hidden">
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Members</p>
              </div>

              {loading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 w-24 rounded bg-white/5" />
                        <div className="h-2 w-16 rounded bg-white/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-1">
                  {members.map((m) => {
                    const isSelected = selected?.id === m.id
                    const isSelf     = m.id === profile?.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelected(m)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/4"
                        style={isSelected ? { background: 'rgba(79,70,229,0.12)' } : {}}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                          style={{
                            background: m.role === 'manager'
                              ? 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(167,139,250,0.3))'
                              : 'rgba(79,70,229,0.2)',
                            border: `1px solid ${m.role === 'manager' ? 'rgba(139,92,246,0.4)' : 'rgba(79,70,229,0.25)'}`,
                          }}
                        >
                          <AvatarImage src={m.avatar} alt={m.name} fallback={m.name?.slice(0,2).toUpperCase() ?? '??'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {m.name}{isSelf && <span className="text-white/30"> (you)</span>}
                          </p>
                          <p className="text-[10px] text-white/35 capitalize">{m.department ?? m.role}</p>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6366f1' }} />
                        )}
                      </button>
                    )
                  })}
                  {members.length === 0 && (
                    <p className="text-xs text-white/25 text-center py-8">No members found</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Schedule editor panel */}
          <div className="flex-1 min-w-0">
            {selected ? (
              <ManagerScheduleEditor
                key={selected.id}
                userId={selected.id}
                memberName={selected.id === profile?.id ? `${selected.name} (you)` : selected.name}
              />
            ) : (
              <div
                className="glass-card flex flex-col items-center justify-center py-20 text-center"
              >
                <User className="w-8 h-8 text-white/15 mb-3" />
                <p className="text-sm text-white/30">Select a member to view or edit their schedule</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
