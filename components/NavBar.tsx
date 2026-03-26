'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Zap } from 'lucide-react'
import LiveClock from './LiveClock'

const navLinks = [
  { href: '/',          label: 'Dashboard' },
  { href: '/timeline',  label: 'Timeline'  },
  { href: '/calendar',  label: 'Calendar'  },
  { href: '/team',      label: 'Team'      },
]

export default function NavBar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [timedIn, setTimedIn] = useState(false)

  const handleTimeIn = () => setTimedIn(true)
  const handleTimeOut = () => setTimedIn(false)

  return (
    <nav className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0 border-b border-white/10 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-bolt-maroon/30 border border-bolt-maroon/50 flex items-center justify-center group-hover:shadow-maroon-sm transition-all duration-200">
              <Zap className="w-4 h-4 text-[#c0392b]" fill="currentColor" />
            </div>
            <span className="text-lg font-bold tracking-widest">
              <span className="text-white">B</span>
              <span className="text-[#c0392b]">O</span>
              <span className="text-white">L</span>
              <span className="text-[#c0392b]">T</span>
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
          </div>

          {/* Right — clock + time in/out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 glass-card px-3 py-1.5 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b] animate-pulse" />
              <LiveClock />
            </div>

            {/* Time In / Time Out toggle buttons */}
            <div className="flex items-center rounded-xl overflow-hidden border border-white/10">
              <button
                onClick={handleTimeIn}
                className={`px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  timedIn
                    ? 'bg-bolt-maroon text-white shadow-maroon-sm'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                Time In
              </button>
              <div className="w-px h-5 bg-white/10" />
              <button
                onClick={handleTimeOut}
                className={`px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                  !timedIn
                    ? 'bg-bolt-maroon text-white shadow-maroon-sm'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                Time Out
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 px-4 py-3 animate-fade-in">
          {/* Clock on mobile */}
          <div className="flex items-center gap-2 mb-3 sm:hidden">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b] animate-pulse" />
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
          </div>
        </div>
      )}
    </nav>
  )
}
