'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export type SortField = 'date' | 'duration'
export type SortDir   = 'asc' | 'desc'

interface SortControlsProps {
  field: SortField
  dir: SortDir
  onChange: (field: SortField, dir: SortDir) => void
}

export default function SortControls({ field, dir, onChange }: SortControlsProps) {
  const toggle = (f: SortField) => {
    if (field === f) {
      onChange(f, dir === 'asc' ? 'desc' : 'asc')
    } else {
      onChange(f, 'desc')
    }
  }

  const Icon = ({ f }: { f: SortField }) => {
    if (field !== f) return <ArrowUpDown className="w-3 h-3 opacity-40" />
    return dir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-[#c0392b]" />
      : <ArrowDown className="w-3 h-3 text-[#c0392b]" />
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40">Sort by:</span>
      <button
        onClick={() => toggle('date')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
          field === 'date'
            ? 'bg-bolt-maroon/20 border border-bolt-maroon/40 text-[#c0392b]'
            : 'glass-card text-white/60 hover:text-white'
        }`}
      >
        <Icon f="date" />
        Date
      </button>
      <button
        onClick={() => toggle('duration')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
          field === 'duration'
            ? 'bg-bolt-maroon/20 border border-bolt-maroon/40 text-[#c0392b]'
            : 'glass-card text-white/60 hover:text-white'
        }`}
      >
        <Icon f="duration" />
        Duration
      </button>
    </div>
  )
}
