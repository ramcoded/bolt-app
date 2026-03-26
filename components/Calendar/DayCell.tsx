'use client'

import { useState, useRef } from 'react'
import { CalendarTask, CalendarNote } from '@/lib/mock-data'
import { toDateStr } from '@/lib/time-utils'

interface DayCellProps {
  date: Date
  tasks: CalendarTask[]
  note: string
  isToday: boolean
  isCurrentMonth: boolean
  onNoteChange: (dateStr: string, content: string) => void
}

export default function DayCell({
  date,
  tasks,
  note,
  isToday,
  isCurrentMonth,
  onNoteChange,
}: DayCellProps) {
  const [editing, setEditing] = useState(false)
  const [hoverTask, setHoverTask] = useState<CalendarTask | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const cellRef = useRef<HTMLDivElement>(null)
  const dateStr = toDateStr(date)

  const handleTaskHover = (task: CalendarTask, e: React.MouseEvent) => {
    const rect = cellRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    setHoverTask(task)
  }

  return (
    <div
      ref={cellRef}
      className={`relative min-h-[90px] p-2 rounded-xl border transition-all duration-200 cursor-pointer group ${
        isToday
          ? 'bg-bolt-maroon/15 border-bolt-maroon/50 shadow-maroon-sm'
          : isCurrentMonth
          ? 'bg-white/4 border-white/8 hover:bg-white/8 hover:border-white/15'
          : 'bg-white/2 border-white/5 opacity-40'
      }`}
      onClick={() => isCurrentMonth && setEditing(true)}
    >
      {/* Day number */}
      <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
        isToday ? 'bg-bolt-maroon text-white' : 'text-white/60'
      }`}>
        {date.getDate()}
      </div>

      {/* Tasks */}
      <div className="space-y-0.5">
        {tasks.slice(0, 3).map((task) => (
          <div
            key={task.id}
            className="text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium cursor-default"
            style={{
              backgroundColor: task.color + '33',
              color: task.color,
              border: `1px solid ${task.color}55`,
            }}
            onMouseEnter={(e) => handleTaskHover(task, e)}
            onMouseLeave={() => setHoverTask(null)}
            onClick={(e) => e.stopPropagation()}
          >
            {task.title}
          </div>
        ))}
        {tasks.length > 3 && (
          <p className="text-[10px] text-white/30 pl-1">+{tasks.length - 3} more</p>
        )}
      </div>

      {/* Note indicator */}
      {note && !editing && (
        <div className="mt-1 text-[10px] text-white/30 italic truncate">{note}</div>
      )}

      {/* Note editor */}
      {editing && (
        <textarea
          autoFocus
          value={note}
          onChange={(e) => onNoteChange(dateStr, e.target.value)}
          onBlur={() => setEditing(false)}
          onClick={(e) => e.stopPropagation()}
          placeholder="Add a note..."
          className="w-full mt-1 bg-transparent text-[10px] text-white/70 placeholder-white/20 outline-none resize-none"
          rows={2}
        />
      )}

      {/* Task hover tooltip */}
      {hoverTask && (
        <div
          className="tooltip-canvas"
          style={{
            top: tooltipPos.y + 8,
            left: Math.min(tooltipPos.x, 160),
          }}
        >
          <div
            className="w-2 h-2 rounded-full mb-1.5"
            style={{ backgroundColor: hoverTask.color }}
          />
          <p className="font-semibold text-white mb-1">{hoverTask.title}</p>
          <p className="text-white/50 leading-relaxed">{hoverTask.description}</p>
          <div className="mt-2 flex items-center gap-1">
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
              style={{
                backgroundColor: hoverTask.color + '33',
                color: hoverTask.color,
              }}
            >
              {hoverTask.priority}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
