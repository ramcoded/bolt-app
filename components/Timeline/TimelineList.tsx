'use client'

import { useState } from 'react'
import { timeRecords, TimeRecord } from '@/lib/mock-data'
import { formatDate, formatDuration } from '@/lib/time-utils'
import SortControls, { SortField, SortDir } from './SortControls'
import { Clock, LogIn, LogOut, Timer } from 'lucide-react'

export default function TimelineList() {
  const [field, setField] = useState<SortField>('date')
  const [dir, setDir]     = useState<SortDir>('desc')

  const sorted = [...timeRecords].sort((a, b) => {
    let cmp = 0
    if (field === 'date') {
      cmp = a.date.localeCompare(b.date)
    } else {
      const da = a.duration ?? -1
      const db = b.duration ?? -1
      cmp = da - db
    }
    return dir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-white/40">{timeRecords.length} records</p>
        <SortControls
          field={field}
          dir={dir}
          onChange={(f, d) => { setField(f); setDir(d) }}
        />
      </div>

      <div className="space-y-2">
        {sorted.map((record) => (
          <TimelineRow key={record.id} record={record} />
        ))}
      </div>
    </div>
  )
}

function TimelineRow({ record }: { record: TimeRecord }) {
  const isActive = record.timeOut === null

  return (
    <div className={`glass-card p-4 border-l-2 transition-all duration-200 hover:bg-white/8 ${
      isActive ? 'border-l-green-400' : 'border-l-bolt-maroon'
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Date */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <Clock className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">{formatDate(record.date)}</p>
            <p className="text-[10px] text-white/30">{record.date}</p>
          </div>
        </div>

        {/* Time In */}
        <div className="flex items-center gap-1.5">
          <LogIn className="w-3.5 h-3.5 text-green-400" />
          <div>
            <p className="text-[10px] text-white/40">Time In</p>
            <p className="text-sm font-mono font-semibold text-white">{record.timeIn}</p>
          </div>
        </div>

        {/* Time Out */}
        <div className="flex items-center gap-1.5">
          <LogOut className="w-3.5 h-3.5 text-[#c0392b]" />
          <div>
            <p className="text-[10px] text-white/40">Time Out</p>
            {record.timeOut ? (
              <p className="text-sm font-mono font-semibold text-white">{record.timeOut}</p>
            ) : (
              <p className="text-sm font-mono font-semibold text-green-400 animate-pulse">Active</p>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5">
          <Timer className="w-3.5 h-3.5 text-white/30" />
          <div>
            <p className="text-[10px] text-white/40">Duration</p>
            {record.duration !== null ? (
              <p className="text-sm font-semibold text-[#c0392b]">{formatDuration(record.duration)}</p>
            ) : (
              <p className="text-sm font-semibold text-green-400">Ongoing</p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          {isActive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-green-400/15 border border-green-400/30 text-[10px] font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Clocked In
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-[10px] font-semibold text-white/40">
              Complete
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
