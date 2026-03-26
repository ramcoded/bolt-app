'use client'

import { useState, useEffect } from 'react'
import { LogIn, LogOut, X } from 'lucide-react'

interface ConfirmTimeModalProps {
  action: 'in' | 'out'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmTimeModal({ action, onConfirm, onCancel }: ConfirmTimeModalProps) {
  const isIn = action === 'in'
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    setCurrentTime(fmt())
    const id = setInterval(() => setCurrentTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="modal-overlay animate-fade-in" onClick={onCancel}>
      <div
        className="p-6 w-full max-w-sm mx-4 animate-scale-in"
        style={{
          background: 'rgba(12,12,20,0.96)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(120,110,255,0.15)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: isIn
              ? 'rgba(34,197,94,0.15)'
              : 'rgba(79,70,229,0.15)',
            border: isIn
              ? '1px solid rgba(34,197,94,0.3)'
              : '1px solid rgba(79,70,229,0.3)',
          }}
        >
          {isIn
            ? <LogIn  className="w-6 h-6 text-green-400" />
            : <LogOut className="w-6 h-6 text-indigo-400" />
          }
        </div>

        {/* Title */}
        <h2 className="text-base font-semibold text-white text-center mb-1">
          Confirm Time {isIn ? 'In' : 'Out'}
        </h2>
        <p className="text-sm text-white/40 text-center mb-6">
          {isIn
            ? 'Are you sure you want to clock in now?'
            : 'Are you sure you want to clock out now?'
          }
        </p>

        {/* Current time */}
        <div className="flex items-center justify-center gap-2 mb-6 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs text-white/40">Current time</span>
          <span className="text-sm font-mono font-semibold text-white">
            {currentTime}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white transition-all duration-200"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            style={{
              background: isIn ? '#16a34a' : 'var(--bolt-accent)',
              boxShadow: isIn
                ? '0 0 16px rgba(22,163,74,0.4)'
                : '0 0 16px rgba(79,70,229,0.4)',
            }}
          >
            Clock {isIn ? 'In' : 'Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
