'use client'

import { useState } from 'react'
import { notifications as initialNotifs } from '@/lib/mock-data'
import { Bell, CheckCheck, AlertCircle, ClipboardList } from 'lucide-react'

const typeIcon = (type: string) => {
  if (type === 'task')     return <ClipboardList className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
  if (type === 'reminder') return <Bell className="w-3.5 h-3.5 text-amber-400" />
  return <AlertCircle className="w-3.5 h-3.5 text-blue-400" />
}

export default function NotificationsCard() {
  const [notifs, setNotifs] = useState(initialNotifs)
  const unread = notifs.filter((n) => !n.read).length

  const markAll = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
  const markOne = (id: string) =>
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))

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
