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
    if (field !== f) return <ArrowUpDown className="w-3 h-3 opacity-30" />
    return dir === 'asc'
      ? <ArrowUp   className="w-3 h-3" style={{ color: '#6366f1' }} />
      : <ArrowDown className="w-3 h-3" style={{ color: '#6366f1' }} />
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/35">Sort by:</span>
      {(['date', 'duration'] as SortField[]).map((f) => (
        <button
          key={f}
          onClick={() => toggle(f)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 capitalize"
          style={
            field === f
              ? { background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.35)', color: '#6366f1' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
          }
        >
          <Icon f={f} />
          {f}
        </button>
      ))}
    </div>
  )
}
