'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { isWithin30Min, minutesUntil } from '@/lib/time-utils'
import { nextScheduledTimeIn, nextScheduledTimeOut } from '@/lib/mock-data'

export default function ReminderBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [type,      setType]      = useState<'in' | 'out' | null>(null)
  const [mins,      setMins]      = useState(0)

  useEffect(() => {
    const check = () => {
      if (isWithin30Min(nextScheduledTimeIn)) {
        setType('in'); setMins(minutesUntil(nextScheduledTimeIn)); setDismissed(false)
      } else if (isWithin30Min(nextScheduledTimeOut)) {
        setType('out'); setMins(minutesUntil(nextScheduledTimeOut)); setDismissed(false)
      } else {
        setType(null)
      }
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  if (!type || dismissed) return null

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl animate-fade-in"
      style={{ background: 'rgba(79,70,229,0.12)', border: '1px solid rgba(79,70,229,0.28)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(79,70,229,0.2)' }}>
          <Bell className="w-4 h-4 animate-pulse" style={{ color: '#6366f1' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">
            Reminder: Time {type === 'in' ? 'In' : 'Out'} in {mins} minute{mins !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-white/45 mt-0.5">
            Scheduled {type === 'in' ? 'time-in' : 'time-out'} at{' '}
            {type === 'in' ? nextScheduledTimeIn : nextScheduledTimeOut}
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
