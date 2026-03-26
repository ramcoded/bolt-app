'use client'

import { useState } from 'react'
import { notifications as initialNotifs } from '@/lib/mock-data'
import { Bell, CheckCheck, AlertCircle, ClipboardList } from 'lucide-react'

const typeIcon = (type: string) => {
  if (type === 'task')     return <ClipboardList className="w-3.5 h-3.5 text-[#c0392b]" />
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
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#c0392b]" />
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
          {unread > 0 && (
            <span className="w-5 h-5 rounded-full bg-bolt-maroon text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors">
            <CheckCheck className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {notifs.map((n) => (
          <button
            key={n.id}
            onClick={() => markOne(n.id)}
            className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl transition-colors text-left ${
              n.read ? 'bg-transparent hover:bg-white/5' : 'bg-white/8 hover:bg-white/10 border border-white/10'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">{typeIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium truncate ${n.read ? 'text-white/50' : 'text-white'}`}>
                {n.title}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5 truncate">{n.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-[10px] text-white/30">{n.time}</span>
              {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#c0392b]" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
