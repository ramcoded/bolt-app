'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useTimeRecords } from '@/lib/time-records-context'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayEntry = { day: string; hours: number }

function buildWeeklyHours(records: { date: string; duration: number | null }[]): DayEntry[] {
  // Anchor to Sunday of the current calendar week
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    // Sum all records for this date (handles multiple sessions per day)
    const dayMins = records
      .filter((r) => r.date === dateStr && (r.duration ?? 0) > 0)
      .reduce((sum, r) => sum + (r.duration ?? 0), 0)
    const hours = Math.max(0, Math.round((dayMins / 60) * 100) / 100)
    return { day: DAY_LABELS[d.getDay()], hours }
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <p className="text-white/50">{label}</p>
        <p className="font-semibold" style={{ color: '#6366f1' }}>{payload[0].value}h productive</p>
      </div>
    )
  }
  return null
}

export default function TimelineGraphCard() {
  const { records } = useTimeRecords()
  const [weeklyHours, setWeeklyHours] = useState<DayEntry[]>([])

  useEffect(() => {
    setWeeklyHours(buildWeeklyHours(records))
  }, [records])

  const totalHours = weeklyHours.reduce((s, d) => s + d.hours, 0).toFixed(1)

  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Productive Hours</h2>
          <p className="text-xs text-white/40 mt-0.5">Hours actively worked this week</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <TrendingUp className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
          <span className="text-sm font-bold text-white">{totalHours}h</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={weeklyHours} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            reversed={false}
            domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(79,70,229,0.3)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#hoursGradient)"
            dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
