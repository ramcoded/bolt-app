'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Clock, LogIn, LogOut, Timer, User, RefreshCw } from 'lucide-react'
import ManagerScheduleEditor from './ManagerScheduleEditor'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDuration } from '@/lib/time-utils'
import type { TeamMember } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'

type TimeRecord = {
  id: string
  date: string
  timeIn: string
  timeOut: string | null
  duration: number | null
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function ManagerTimeline() {
  const [members,        setMembers]        = useState<TeamMember[]>([])
  const [selected,       setSelected]       = useState<TeamMember | null>(null)
  const [records,        setRecords]        = useState<TimeRecord[]>([])
  const [loading,        setLoading]        = useState(false)
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [filterYear,     setFilterYear]     = useState<number | null>(null)
  const [filterMonth,    setFilterMonth]    = useState<number | null>(null)

  // Load all team members
  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setMembers(d) })
  }, [])

  const loadRecords = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/manager/time-records?userId=${userId}`, { cache: 'no-store' })
      const data = await res.json()
      if (Array.isArray(data)) setRecords(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selected) { setRecords([]); return }
    loadRecords(selected.id)
  }, [selected, loadRecords])

  // Real-time: re-fetch when selected employee clocks in/out
  useEffect(() => {
    if (!selected) return
    const supabase = createClient()
    const channel  = supabase
      .channel(`mgr-records-${selected.id}`)
      .on('postgres_changes' as any, {
        event:  '*',
        schema: 'public',
        table:  'time_records',
        filter: `user_id=eq.${selected.id}`,
      }, () => loadRecords(selected.id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selected, loadRecords])

  // Derive year options from loaded records
  const years = Array.from(new Set(records.map((r) => parseInt(r.date.slice(0, 4))))).sort((a, b) => b - a)

  const filtered = records.filter((r) => {
    if (filterYear  !== null && parseInt(r.date.slice(0, 4))     !== filterYear)  return false
    if (filterMonth !== null && parseInt(r.date.slice(5, 7)) - 1 !== filterMonth) return false
    return true
  })

  const activeRecord = records.find((r) => r.timeOut === null)

  return (
    <div className="space-y-4">

      {/* Member dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-white/30 flex-shrink-0" />
            {selected ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white overflow-hidden"
                  style={{ background: 'rgba(79,70,229,0.35)' }}
                >
                  <AvatarImage src={selected.avatar} alt={selected.name} fallback={selected.name?.slice(0,2).toUpperCase() ?? '??'} />
                </div>
                <span className="text-white font-medium">{selected.name}</span>
                {activeRecord && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Clocked In
                  </span>
                )}
              </div>
            ) : (
              <span className="text-white/40">Select a team member…</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl overflow-hidden"
            style={{
              background:  'rgba(10,10,20,0.98)',
              border:      '1px solid rgba(255,255,255,0.06)',
              boxShadow:   '0 8px 32px rgba(0,0,0,0.55)',
            }}
          >
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m)
                  setDropdownOpen(false)
                  setFilterYear(null)
                  setFilterMonth(null)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                style={selected?.id === m.id ? { background: 'rgba(79,70,229,0.12)' } : {}}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 overflow-hidden"
                  style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}
                >
                  <AvatarImage src={m.avatar} alt={m.name} fallback={m.name?.slice(0,2).toUpperCase() ?? '??'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{m.name}</p>
                  <p className="text-[10px] text-white/35 capitalize">{m.role}</p>
                </div>
                {selected?.id === m.id && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6366f1' }} />
                )}
              </button>
            ))}
            {members.length === 0 && (
              <p className="text-xs text-white/25 text-center py-6">No team members found</p>
            )}
          </div>
        )}
      </div>

      {/* Schedule editor — shown when a member is selected */}
      {selected && (
        <ManagerScheduleEditor userId={selected.id} memberName={selected.name} />
      )}

      {/* Filters + record count */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/35">Filter:</span>

          <select
            value={filterYear ?? ''}
            onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : null)}
            className="text-xs text-white outline-none px-3 py-1.5 rounded-xl appearance-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', colorScheme: 'dark' }}
          >
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={filterMonth ?? ''}
            onChange={(e) => setFilterMonth(e.target.value !== '' ? parseInt(e.target.value) : null)}
            className="text-xs text-white outline-none px-3 py-1.5 rounded-xl appearance-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)', colorScheme: 'dark' }}
          >
            <option value="">All Months</option>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>

          <span className="text-xs text-white/25 ml-auto">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>

          <button
            onClick={() => loadRecords(selected.id)}
            disabled={loading}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Records list */}
      {selected ? (
        <div className="space-y-2">
          {loading && records.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card p-4 animate-pulse flex gap-6">
                <div className="h-3 w-28 rounded bg-white/5" />
                <div className="h-3 w-16 rounded bg-white/5" />
                <div className="h-3 w-16 rounded bg-white/5" />
                <div className="h-3 w-16 rounded bg-white/5" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="glass-card py-12 text-center">
              <p className="text-sm text-white/30">No records for this period</p>
            </div>
          ) : (
            filtered.map((record, i) => (
              <RecordRow key={record.id} record={record} index={i} />
            ))
          )}
        </div>
      ) : (
        <div className="glass-card py-16 text-center">
          <User className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/30">Select a team member above to view their timeline</p>
          <p className="text-xs text-white/20 mt-1">Clock-ins and outs update in real-time</p>
        </div>
      )}
    </div>
  )
}

function RecordRow({ record, index }: { record: TimeRecord; index: number }) {
  const isActive = record.timeOut === null
  return (
    <div
      className="glass-card p-4 border-l-2 hover:bg-white/4 transition-colors"
      style={{ borderLeftColor: isActive ? '#4ade80' : '#4f46e5' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-[140px]">
          <Clock className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">{formatDate(record.date)}</p>
            <p className="text-[10px] text-white/30">{record.date}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <LogIn className="w-3.5 h-3.5 text-green-400" />
          <div>
            <p className="text-[10px] text-white/35">Time In</p>
            <p className="text-sm font-mono font-semibold text-white">{record.timeIn}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
          <div>
            <p className="text-[10px] text-white/35">Time Out</p>
            {record.timeOut
              ? <p className="text-sm font-mono font-semibold text-white">{record.timeOut}</p>
              : <p className="text-sm font-mono font-semibold text-green-400 animate-pulse">Active</p>
            }
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-white/25" />
          <div>
            <p className="text-[10px] text-white/35">Duration</p>
            {record.duration !== null
              ? <p className="text-sm font-semibold" style={{ color: '#6366f1' }}>{formatDuration(record.duration)}</p>
              : <p className="text-sm font-semibold text-green-400">Ongoing</p>
            }
          </div>
        </div>

        <div className="flex-shrink-0">
          {isActive ? (
            <span
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-green-400"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Clocked In
            </span>
          ) : (
            <span
              className="px-2.5 py-1 rounded-xl text-[10px] font-semibold text-white/35"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              Complete
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
