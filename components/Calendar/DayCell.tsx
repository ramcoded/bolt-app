'use client'

import { useState, useRef } from 'react'
import { CalendarTask } from '@/lib/mock-data'
import { toDateStr } from '@/lib/time-utils'

type ScheduleOverride = { date: string; type: string; timeIn: string | null; timeOut: string | null }

interface DayCellProps {
  date: Date
  tasks: CalendarTask[]
  note: string
  isToday: boolean
  isCurrentMonth: boolean
  override: ScheduleOverride | null
  onNoteChange: (dateStr: string, content: string) => void
}

const OVERRIDE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  overtime:           { label: 'OT',      color: '#818cf8', bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)'  },
  pre_shift_overtime: { label: 'Pre-OT',  color: '#a78bfa', bg: 'rgba(139,92,246,0.15)',  border: 'rgba(139,92,246,0.35)'  },
  leave:              { label: 'Day Off',  color: '#22d3ee', bg: 'rgba(6,182,212,0.15)',   border: 'rgba(6,182,212,0.35)'   },
}

export default function DayCell({ date, tasks, note, isToday, isCurrentMonth, override, onNoteChange }: DayCellProps) {
  const [editing,    setEditing]    = useState(false)
  const [hoverTask,  setHoverTask]  = useState<CalendarTask | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const cellRef = useRef<HTMLDivElement>(null)
  const dateStr = toDateStr(date)

  const oc = override ? (OVERRIDE_CONFIG[override.type] ?? OVERRIDE_CONFIG.overtime) : null

  const handleTaskHover = (task: CalendarTask, e: React.MouseEvent) => {
    const rect = cellRef.current?.getBoundingClientRect()
    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setHoverTask(task)
  }

  const todayStyle = isToday
    ? { background: 'rgba(79,70,229,0.14)', border: '1px solid rgba(79,70,229,0.40)' }
    : override && isCurrentMonth
    ? { background: oc!.bg, border: `1px solid ${oc!.border}` }
    : isCurrentMonth
    ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
    : { background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', opacity: 0.35 }

  return (
    <div
      ref={cellRef}
      className="relative min-h-[90px] p-2 rounded-xl transition-all duration-200 cursor-pointer"
      style={todayStyle}
      onClick={() => isCurrentMonth && setEditing(true)}
    >
      {/* Day number */}
      <div
        className="text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full"
        style={
          isToday
            ? { background: 'var(--bolt-accent)', color: '#fff' }
            : override && isCurrentMonth
            ? { color: oc!.color }
            : { color: 'rgba(255,255,255,0.5)' }
        }
      >
        {date.getDate()}
      </div>

      {/* Override badge */}
      {override && isCurrentMonth && oc && (
        <div className="mb-1">
          {override.type === 'leave' ? (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}
            >
              Day Off
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md w-fit"
                style={{ background: oc.bg, color: oc.color, border: `1px solid ${oc.border}` }}
              >
                {oc.label}
              </span>
              {override.timeIn && override.timeOut && (
                <span className="text-[9px] font-mono" style={{ color: oc.color }}>
                  {override.timeIn}–{override.timeOut}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tasks — hidden on leave days to avoid clutter */}
      {override?.type !== 'leave' && (
        <div className="space-y-0.5">
          {tasks.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium cursor-default"
              style={{
                backgroundColor: task.completed ? 'rgba(255,255,255,0.04)' : task.color + '25',
                color:           task.completed ? 'rgba(255,255,255,0.25)'  : task.color,
                border:          task.completed ? '1px solid rgba(255,255,255,0.05)' : `1px solid ${task.color}40`,
                textDecoration:  task.completed ? 'line-through' : 'none',
              }}
              onMouseEnter={(e) => handleTaskHover(task, e)}
              onMouseLeave={() => setHoverTask(null)}
              onClick={(e) => e.stopPropagation()}
            >
              {task.title}
            </div>
          ))}
          {tasks.length > 3 && (
            <p className="text-[10px] text-white/25 pl-1">+{tasks.length - 3} more</p>
          )}
        </div>
      )}

      {/* Note indicator */}
      {note && !editing && (
        <div className="mt-1 text-[10px] text-white/25 italic truncate">{note}</div>
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
          className="w-full mt-1 bg-transparent text-[10px] text-white/60 placeholder-white/20 outline-none resize-none"
          rows={2}
        />
      )}

      {/* Hover tooltip */}
      {hoverTask && (
        <div
          className="tooltip-canvas"
          style={{ top: tooltipPos.y + 8, left: Math.min(tooltipPos.x, 160) }}
        >
          <div className="w-2 h-2 rounded-full mb-1.5" style={{ backgroundColor: hoverTask.color }} />
          <p className="font-semibold text-white mb-1">{hoverTask.title}</p>
          <p className="text-white/45 leading-relaxed">{hoverTask.description}</p>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize"
              style={{ background: hoverTask.color + '25', color: hoverTask.color }}>
              {hoverTask.priority}
            </span>
            {hoverTask.completed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
                Completed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
