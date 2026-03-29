'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, ChevronDown, Shield, Settings } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import AvatarImage from '@/components/AvatarImage'

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false)
  const ref    = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user, profile } = useAuth()

  const name   = profile?.name   ?? user?.email ?? 'User'
  const avatar = profile?.avatar ?? name.slice(0, 2).toUpperCase()
  const role   = profile?.role   ?? 'member'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/8 transition-all duration-200 border border-transparent hover:border-white/10"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
          style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 10px rgba(79,70,229,0.4)', border: '2px solid rgba(99,102,241,0.6)' }}
        >
          <AvatarImage src={avatar} alt={name} />
        </div>
        <span className="hidden sm:block text-xs font-medium text-white/70">{name.split(' ')[0]}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 glass-dropdown py-2 animate-scale-in z-50">
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                style={{ background: 'var(--bolt-accent)', boxShadow: '0 0 12px rgba(79,70,229,0.4)', border: '2px solid rgba(99,102,241,0.6)' }}
              >
                <AvatarImage src={avatar} alt={name} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{name}</p>
                <p className="text-xs text-white/40 truncate capitalize">{role}</p>
                <p className="text-[11px] text-white/25 truncate mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Link href="/profile" onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/6 transition-colors">
              <User className="w-4 h-4" />
              View Profile
            </Link>
            {role === 'manager' && (
              <Link href="/manager/dashboard" onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/6 transition-colors">
                <Shield className="w-4 h-4" style={{ color: '#6366f1' }} />
                Manager Dashboard
              </Link>
            )}
            <Link href="/settings" onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/6 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          <div className="py-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/8 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
