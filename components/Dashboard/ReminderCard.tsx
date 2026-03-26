'use client'

import { useEffect, useState } from 'react'
import { Calendar } from 'lucide-react'
import { formatDate } from '@/lib/time-utils'
import type { CalendarTask } from '@/lib/mock-data'

const priorityBadge = (p: string) => {
  if (p === 'high')   return { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', border: 'rgba(239,68,68,0.25)' }
  if (p === 'medium') return { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: 'rgba(245,158,11,0.25)' }
  return { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', border: 'rgba(255,255,255,0.10)' }
}

export default function ReminderCard() {
  const [tasks, setTasks] = useState<CalendarTask[]>([])

  useEffect(() => {
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((data: CalendarTask[]) => {
        const todayStr = new Date().toISOString().split('T')[0]
        const upcoming = (Array.isArray(data) ? data : [])
          .filter((t) => t.date && t.date >= todayStr)
          .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
          .slice(0, 3)
        setTasks(upcoming)
      })
  }, [])

  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4" style={{ color: '#6366f1' }} />
        <h2 className="text-sm font-semibold text-white">Upcoming</h2>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-white/25 text-center py-6">No upcoming tasks</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const badge = priorityBadge(task.priority)
            return (
              <div key={task.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors hover:bg-white/4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: task.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-white truncate">{task.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 capitalize"
                      style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/35 mt-0.5">{formatDate(task.date)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
