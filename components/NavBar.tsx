'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Zap } from 'lucide-react'
import LiveClock from './LiveClock'
import ProfileDropdown from './Profile/ProfileDropdown'
import NotificationDropdown from './NotificationDropdown'
import ConfirmTimeModal from './ConfirmTimeModal'
import { useTimeRecords } from '@/lib/time-records-context'
import { useAuth } from '@/lib/auth-context'

const navLinks = [
  { href: '/',         label: 'Dashboard' },
  { href: '/timeline', label: 'Timeline'  },
  { href: '/calendar', label: 'Calendar'  },
  { href: '/tasks',    label: 'Tasks'     },
  { href: '/team',     label: 'Team'      },
]

export default function NavBar() {
  const pathname  = usePathname()
  const { profile } = useAuth()
  const isManager = profile?.role === 'manager'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [modal,      setModal]      = useState<'in' | 'out' | null>(null)
  const { timedIn, clockIn, clockOut } = useTimeRecords()

  const handleConfirm = () => {
    if (modal === 'in')  clockIn()
    if (modal === 'out') clockOut()
    setModal(null)
  }

  return (
    <>
      <nav
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(5,5,10,0.90) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: 'rgba(79,70,229,0.2)',
                  border: '1px solid rgba(79,70,229,0.4)',
                  boxShadow: '0 0 12px rgba(79,70,229,0.25)',
                }}
              >
                <Zap className="w-4 h-4" style={{ color: '#6366f1' }} fill="currentColor" />
              </div>
              <span className="text-lg font-bold tracking-widest text-white">
                B<span style={{ color: '#6366f1' }}>O</span>LT
              </span>
            </Link>

            {/* Center nav — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={active ? 'nav-link-active' : 'nav-link'}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {isManager && (
                <Link
                  href="/manager/dashboard"
                  className={pathname === '/manager/dashboard' ? 'nav-link-active' : 'nav-link'}
                  style={{ color: pathname === '/manager/dashboard' ? '#818cf8' : 'rgba(99,102,241,0.75)' }}
                >
                  Manager
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Clock */}
              <div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#6366f1' }} />
                <LiveClock />
              </div>

              {/* Time In / Time Out */}
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => setModal('in')}
                  className="px-3 py-2 text-xs font-semibold transition-all duration-200"
                  style={
                    timedIn
                      ? { background: '#16a34a', color: '#fff', boxShadow: '0 0 12px rgba(22,163,74,0.4)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }
                  }
                >
                  Time In
                </button>
                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />
                <button
                  onClick={() => setModal('out')}
                  className="px-3 py-2 text-xs font-semibold transition-all duration-200"
                  style={
                    !timedIn
                      ? { background: 'var(--bolt-accent)', color: '#fff', boxShadow: '0 0 12px rgba(79,70,229,0.4)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }
                  }
                >
                  Time Out
                </button>
              </div>

              {/* Notifications */}
              <NotificationDropdown />

              {/* Profile */}
              <ProfileDropdown />

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-3 animate-fade-in" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-3 sm:hidden">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#6366f1' }} />
              <LiveClock />
            </div>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={active ? 'nav-link-active' : 'nav-link'}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {isManager && (
                <Link
                  href="/manager/dashboard"
                  className={pathname === '/manager/dashboard' ? 'nav-link-active' : 'nav-link'}
                  onClick={() => setMobileOpen(false)}
                >
                  Manager
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Confirmation modal */}
      {modal && (
        <ConfirmTimeModal
          action={modal}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  )
}
