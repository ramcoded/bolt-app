'use client'

import { useEffect, useState } from 'react'
import { calendarTasks } from '@/lib/mock-data'
import { Bell, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/time-utils'

export default function ReminderCard() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const todayStr = now.toISOString().split('T')[0]
  const upcoming = calendarTasks
    .filter((t) => t.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  const priorityBadge = (p: string) => {
    if (p === 'high')   return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (p === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    return 'bg-white/10 text-white/50 border-white/10'
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-[#c0392b]" />
        <h2 className="text-sm font-semibold text-white">Upcoming</h2>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-xs text-white/30 text-center py-6">No upcoming tasks</p>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((task) => (
            <div key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/8 transition-colors border border-white/5">
              <div
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: task.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-white truncate">{task.title}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium flex-shrink-0 ${priorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">{formatDate(task.date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
