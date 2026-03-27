'use client'

import { useEffect, useState } from 'react'
import { Bell, CheckCheck, AlertCircle, ClipboardList } from 'lucide-react'
import type { Notification } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'

const typeIcon = (type: string) => {
  if (type === 'task')     return <ClipboardList className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
  if (type === 'reminder') return <Bell className="w-3.5 h-3.5 text-amber-400" />
  return <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsCard() {
  const [notifs, setNotifs] = useState<Notification[]>([])

  const fetchNotifs = () =>
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotifs(data) })

  useEffect(() => {
    fetchNotifs()

    // Realtime: push new notifications instantly
    const supabase = createClient()
    let channelRef: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channelRef = supabase
        .channel(`notifications-${user.id}`)
        .on('postgres_changes' as any, {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          const n = payload.new
          setNotifs((prev) => [{
            id:          n.id,
            title:       n.title,
            description: n.description,
            type:        n.type,
            read:        n.read,
            time:        formatRelativeTime(n.created_at),
          }, ...prev])
        })
        .subscribe()
    })

    return () => {
      if (channelRef) supabase.removeChannel(channelRef)
    }
  }, [])

  const unread = notifs.filter((n) => !n.read).length

  const markOne = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    // Roll back if the DB update failed
    if (!res.ok) setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)))
  }

  const markAll = async () => {
    const unreadIds = notifs.filter((n) => !n.read).map((n) => n.id)
    if (unreadIds.length === 0) return
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
    await Promise.all(unreadIds.map((id) => fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })))
  }

  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: '#6366f1' }} />
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
          {unread > 0 && (
            <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
              style={{ background: 'var(--bolt-accent)' }}>
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1 text-[10px] text-white/35 hover:text-white transition-colors">
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {notifs.length === 0 && (
          <p className="text-xs text-white/25 text-center py-6">No notifications</p>
        )}
        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => markOne(n.id)}
            className="w-full flex items-start gap-2.5 p-2.5 rounded-xl transition-colors text-left"
            style={
              n.read
                ? { background: 'transparent' }
                : { background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.18)' }
            }
          >
            <div className="flex-shrink-0 mt-0.5">{typeIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${n.read ? 'text-white/45' : 'text-white'}`}>
                {n.title}
              </p>
              <p className="text-[10px] text-white/28 mt-0.5 truncate">{n.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[10px] text-white/25">{n.time}</span>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--bolt-accent-light)' }} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
