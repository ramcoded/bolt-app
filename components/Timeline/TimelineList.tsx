'use client'

import { useState } from 'react'
import { TimeRecord } from '@/lib/mock-data'
import { formatDate, formatDuration } from '@/lib/time-utils'
import { useTimeRecords } from '@/lib/time-records-context'
import SortControls, { SortField, SortDir } from './SortControls'
import { Clock, LogIn, LogOut, Timer } from 'lucide-react'
import ScheduleCard from './ScheduleCard'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function TimelineList() {
  const [field,       setField]       = useState<SortField>('date')
  const [dir,         setDir]         = useState<SortDir>('desc')
  const [filterYear,  setFilterYear]  = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const { records } = useTimeRecords()

  const years = [...new Set(records.map((r) => parseInt(r.date.slice(0, 4))))].sort((a, b) => b - a)

  const filtered = records.filter((r) => {
    if (!r?.id) return false
    if (filterYear  !== null && parseInt(r.date.slice(0, 4))     !== filterYear)  return false
    if (filterMonth !== null && parseInt(r.date.slice(5, 7)) - 1 !== filterMonth) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (field === 'date') {
      cmp = (a.date ?? '').localeCompare(b.date ?? '')
    } else {
      cmp = (a.duration ?? -1) - (b.duration ?? -1)
    }
    return dir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="space-y-4">
      <ScheduleCard />

      <div className="flex flex-wrap items-center justify-between gap-3">
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

          <span className="text-xs text-white/25">
            {sorted.length} record{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>

        <SortControls field={field} dir={dir} onChange={(f, d) => { setField(f); setDir(d) }} />
      </div>

      <div className="space-y-2">
        {sorted.map((record, i) => (
          <TimelineRow key={record.id} record={record} index={i} />
        ))}
        {sorted.length === 0 && (
          <div className="glass-card py-12 text-center">
            <p className="text-sm text-white/30">No records for this period</p>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineRow({ record, index }: { record: TimeRecord; index: number }) {
  const isActive = record.timeOut === null

  return (
    <div
      className="glass-card p-4 border-l-2 transition-all duration-200 hover:bg-white/4 animate-fade-in"
      style={{
        borderLeftColor:   isActive ? '#4ade80' : '#4f46e5',
        animationDelay:    `${index * 50}ms`,
        animationFillMode: 'both',
      }}
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
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-semibold text-green-400"
              style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Clocked In
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl text-[10px] font-semibold text-white/35"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
              Complete
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
