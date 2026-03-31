'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { StickyNote, X, Save } from 'lucide-react'

export default function NotesPanel() {
  const [open,    setOpen]    = useState(false)
  const [content, setContent] = useState('')
  const [status,  setStatus]  = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded    = useRef(false)

  // Load notes on first open
  useEffect(() => {
    if (!open || loaded.current) return
    loaded.current = true
    fetch('/api/user-notes')
      .then(r => r.json())
      .then(d => setContent(d.content ?? ''))
      .catch(() => {})
  }, [open])

  const save = useCallback(async (value: string) => {
    setStatus('saving')
    try {
      await fetch('/api/user-notes', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: value }),
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('idle')
    }
  }, [])

  const handleChange = (value: string) => {
    setContent(value)
    setStatus('idle')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(value), 1000)
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch"
        style={{ height: 'min(520px, 70vh)' }}
      >
        {/* Slide-out panel */}
        <div
          className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width:         open ? 280 : 0,
            opacity:       open ? 1 : 0,
            background:    'rgba(10,10,20,0.97)',
            borderRight:   '1px solid rgba(255,255,255,0.08)',
            borderTop:     '1px solid rgba(255,255,255,0.08)',
            borderBottom:  '1px solid rgba(255,255,255,0.08)',
            borderRadius:  '0 12px 12px 0',
            boxShadow:     '4px 0 32px rgba(0,0,0,0.5)',
            backdropFilter:'blur(24px)',
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <StickyNote className="w-3.5 h-3.5" style={{ color: '#f59e0b' }} />
              <span className="text-xs font-semibold text-white/80">My Notes</span>
            </div>
            <div className="flex items-center gap-2">
              {status === 'saving' && (
                <span className="text-[10px] text-white/30 flex items-center gap-1">
                  <Save className="w-3 h-3 animate-pulse" /> Saving…
                </span>
              )}
              {status === 'saved' && (
                <span className="text-[10px] text-green-400/70">Saved</span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-white/25 hover:text-white hover:bg-white/8 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Write anything…"
            className="flex-1 w-full px-4 py-3 text-sm text-white/70 bg-transparent resize-none outline-none leading-relaxed placeholder-white/15"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Tab handle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
          style={{
            width:        28,
            background:   open ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.12)',
            border:       '1px solid rgba(245,158,11,0.3)',
            borderLeft:   open ? 'none' : '1px solid rgba(245,158,11,0.3)',
            borderRadius: open ? '0 8px 8px 0' : '0 8px 8px 0',
            boxShadow:    '2px 0 12px rgba(0,0,0,0.3)',
            cursor:       'pointer',
          }}
        >
          <span
            className="text-[10px] font-bold tracking-widest select-none"
            style={{
              color:     '#f59e0b',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}
          >
            NOTES
          </span>
        </button>
      </div>
    </>
  )
}
