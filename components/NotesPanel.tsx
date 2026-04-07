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
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden sm:flex items-stretch"
        style={{ height: 'min(400px, 60vh)' }}
      >
        {/* Slide-out panel */}
        <div
          className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width:         open ? 240 : 0,
            opacity:       open ? 1 : 0,
            background:    'rgba(10,10,20,0.95)',
            borderRight:   '1px solid rgba(255,255,255,0.06)',
            borderTop:     '1px solid rgba(255,255,255,0.06)',
            borderBottom:  '1px solid rgba(255,255,255,0.06)',
            borderRadius:  '0 10px 10px 0',
            boxShadow:     '4px 0 20px rgba(0,0,0,0.35)',
            backdropFilter:'blur(20px)',
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-1.5">
              <StickyNote className="w-3 h-3" style={{ color: 'rgba(245,158,11,0.6)' }} />
              <span className="text-[11px] font-medium text-white/50">Notes</span>
            </div>
            <div className="flex items-center gap-1.5">
              {status === 'saving' && (
                <span className="text-[9px] text-white/25 flex items-center gap-1">
                  <Save className="w-2.5 h-2.5 animate-pulse" /> saving
                </span>
              )}
              {status === 'saved' && (
                <span className="text-[9px] text-green-400/50">saved</span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-0.5 rounded text-white/20 hover:text-white/50 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            placeholder="Write anything…"
            className="flex-1 w-full px-3 py-2.5 text-xs text-white/60 bg-transparent resize-none outline-none leading-relaxed placeholder-white/15"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {/* Tab handle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 flex items-center justify-center transition-all duration-200"
          style={{
            width:        18,
            background:   open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderLeft:   open ? 'none' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: '0 6px 6px 0',
            boxShadow:    '2px 0 8px rgba(0,0,0,0.2)',
            cursor:       'pointer',
          }}
        >
          <StickyNote
            className="w-2.5 h-2.5"
            style={{ color: open ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.2)' }}
          />
        </button>
      </div>
    </>
  )
}
