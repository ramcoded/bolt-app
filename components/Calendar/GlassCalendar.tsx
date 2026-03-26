'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday as isTodayFn, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { calendarTasks, calendarNotes as initialNotes, CalendarNote } from '@/lib/mock-data'
import { toDateStr } from '@/lib/time-utils'
import DayCell from './DayCell'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function GlassCalendar() {
  const [current, setCurrent] = useState(new Date())
  const [notes, setNotes] = useState<CalendarNote[]>(initialNotes)

  const handleNoteChange = (dateStr: string, content: string) => {
    setNotes((prev) => {
      const exists = prev.find((n) => n.date === dateStr)
      if (exists) {
        return prev.map((n) => (n.date === dateStr ? { ...n, content } : n))
      }
      return [...prev, { date: dateStr, content }]
    })
  }

  // Build calendar grid — full weeks covering the month
  const monthStart = startOfMonth(current)
  const monthEnd   = endOfMonth(current)
  const gridStart  = startOfWeek(monthStart)
  const gridEnd    = endOfWeek(monthEnd)

  const days: Date[] = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  const tasksForDate = (dateStr: string) =>
    calendarTasks.filter((t) => t.date === dateStr)

  const noteForDate = (dateStr: string) =>
    notes.find((n) => n.date === dateStr)?.content ?? ''

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-[#c0392b]" />
          <h2 className="text-lg font-bold text-white">
            {format(current, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent((c) => subMonths(c, 1))}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrent((c) => addMonths(c, 1))}
            className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-[11px] font-semibold text-white/30 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateStr = toDateStr(day)
          return (
            <DayCell
              key={dateStr}
              date={day}
              tasks={tasksForDate(dateStr)}
              note={noteForDate(dateStr)}
              isToday={isTodayFn(day)}
              isCurrentMonth={isSameMonth(day, current)}
              onNoteChange={handleNoteChange}
            />
          )
        })}
      </div>

      <p className="text-[10px] text-white/20 mt-3 text-center">
        Click a day to add a note — hover tasks for details
      </p>
    </div>
  )
}
