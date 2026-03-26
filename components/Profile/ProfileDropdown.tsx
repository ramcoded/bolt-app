'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

const ME = {
  name:   'Roy Martinez',
  role:   'Frontend Developer',
  avatar: 'RM',
  email:  'roy.martinez@bolt.team',
}

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/8 transition-all duration-200 border border-transparent hover:border-white/10"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 10px rgba(79,70,229,0.4)' }}
        >
          {ME.avatar}
        </div>
        <span className="hidden sm:block text-xs font-medium text-white/70">{ME.name.split(' ')[0]}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 glass-card py-2 animate-scale-in z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 12px rgba(79,70,229,0.4)' }}
              >
                {ME.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{ME.name}</p>
                <p className="text-xs text-white/40 truncate">{ME.role}</p>
                <p className="text-[11px] text-white/25 truncate mt-0.5">{ME.email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/6 transition-colors text-left">
              <User className="w-4 h-4" />
              View Profile
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/6 transition-colors text-left">
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

          <div className="border-t border-white/8 py-1">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/8 transition-colors text-left">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
