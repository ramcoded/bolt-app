'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck, ClipboardList, AlertCircle, MessageSquare, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import type { Notification } from '@/lib/mock-data'

function typeIcon(type: string) {
  if (type === 'task')    return <ClipboardList className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
  if (type === 'message') return <MessageSquare  className="w-3.5 h-3.5 text-emerald-400" />
  if (type === 'reminder')return <Bell           className="w-3.5 h-3.5 text-amber-400" />
  return <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
}

export default function NotificationDropdown() {
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const { profile } = useAuth()

  // Fetch on mount
  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => setNotifs(Array.isArray(data) ? data : []))
  }, [])

  // Realtime: new notifications
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()
    const channel  = supabase
      .channel(`notifs-${profile.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (payload: any) => {
          const n = payload.new
          setNotifs((prev) => [{
            id:          n.id,
            title:       n.title,
            description: n.description,
            type:        n.type,
            read:        false,
            time:        'just now',
          }, ...prev])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const unread = notifs.filter((n) => !n.read).length

  const markOne = async (id: string) => {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  }

  const markAll = async () => {
    const ids = notifs.filter((n) => !n.read).map((n) => n.id)
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    await Promise.all(ids.map((id) => fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })))
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-white/45 hover:text-white transition-colors"
        style={{ background: open ? 'rgba(255,255,255,0.07)' : undefined }}
      >
        <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
            style={{ background: 'var(--bolt-accent)', border: '1.5px solid #0a0a0f' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden animate-fade-in z-50"
          style={{
            background:    'rgba(10,10,20,0.97)',
            border:        '1px solid rgba(255,255,255,0.06)',
            boxShadow:     '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,70,229,0.08)',
            backdropFilter:'blur(28px)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: '#6366f1' }} />
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread > 0 && (
                <span
                  className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--bolt-accent)' }}
                >
                  {unread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/6"
                >
                  <CheckCheck className="w-3 h-3" />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/6 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-xs text-white/25">No notifications</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {notifs.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markOne(n.id)}
                    className="w-full flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors text-left"
                    style={
                      n.read
                        ? { background: 'transparent' }
                        : { background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)' }
                    }
                  >
                    <div className="flex-shrink-0 mt-0.5">{typeIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${n.read ? 'text-white/40' : 'text-white'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-white/30 mt-0.5 truncate">{n.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-[10px] text-white/22 whitespace-nowrap">{n.time}</span>
                      {!n.read && (
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div
              className="px-4 py-2.5 text-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-[11px] text-white/25">
                {unread === 0 ? 'All caught up' : `${unread} unread notification${unread > 1 ? 's' : ''}`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
