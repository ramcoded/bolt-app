'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, ChevronDown } from 'lucide-react'
import { useTimeRecords } from '@/lib/time-records-context'

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

type DayEntry = { day: string; hours: number }

type Rec = { date: string; duration: number | null; timeIn: string; timeOut: string | null }

function minsForDate(records: Rec[], dateStr: string, todayStr: string): number {
  const now = new Date()
  return records
    .filter((r) => r.date === dateStr)
    .reduce((sum, r) => {
      if ((r.duration ?? 0) > 0) return sum + r.duration!
      // In-progress session — estimate elapsed time (only applies to today)
      if (!r.timeOut && r.timeIn && dateStr === todayStr) {
        const [inH, inM] = r.timeIn.split(':').map(Number)
        const elapsed = now.getHours() * 60 + now.getMinutes() - (inH * 60 + inM)
        return sum + Math.max(0, elapsed)
      }
      return sum
    }, 0)
}

function buildWeeklyData(records: Rec[]): DayEntry[] {
  const today   = new Date()
  const sunday  = new Date(today)
  sunday.setDate(today.getDate() - today.getDay())
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const mins = minsForDate(records, dateStr, todayStr)
    return { day: DAY_LABELS[d.getDay()], hours: Math.max(0, Math.round((mins / 60) * 100) / 100) }
  })
}

function buildMonthlyData(records: Rec[], year: number, month: number): DayEntry[] {
  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day     = i + 1
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const mins    = minsForDate(records, dateStr, todayStr)
    return { day: String(day), hours: Math.max(0, Math.round((mins / 60) * 100) / 100) }
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

function FilterSelect({
  value, onChange, children, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  placeholder: string
}) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-medium text-white outline-none cursor-pointer transition-all"
        style={{
          background:  'rgba(255,255,255,0.05)',
          border:      '1px solid rgba(255,255,255,0.08)',
          colorScheme: 'dark',
        }}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="absolute right-2 w-3 h-3 text-white/35 pointer-events-none" />
    </div>
  )
}

export default function TimelineGraphCard() {
  const { records } = useTimeRecords()
  const [filterYear,  setFilterYear]  = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const now = new Date()

  // Build year list from record data + always include current year
  const availableYears = useMemo(() => {
    const years = new Set<number>([now.getFullYear()])
    records.forEach((r) => { const y = parseInt(r.date?.slice(0, 4)); if (y) years.add(y) })
    return Array.from(years).sort((a, b) => b - a)
  }, [records])

  const chartData = useMemo(() => {
    const yr = parseInt(filterYear)
    const mo = parseInt(filterMonth) // 0-indexed
    if (filterYear && filterMonth !== '') {
      return buildMonthlyData(records, yr, mo)
    }
    return buildWeeklyData(records)
  }, [records, filterYear, filterMonth])

  const totalHours   = chartData.reduce((s, d) => s + d.hours, 0).toFixed(1)
  const isMonthView  = filterYear !== '' && filterMonth !== ''

  const periodLabel = isMonthView
    ? `${MONTH_NAMES[parseInt(filterMonth)]} ${filterYear}`
    : 'This Week'

  // Show every Nth tick on monthly view to avoid cramping
  const tickInterval = isMonthView ? 4 : 0

  return (
    <div className="glass-card p-5 h-full">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Productive Hours</h2>
          <p className="text-xs text-white/40 mt-0.5">{periodLabel}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year dropdown */}
          <FilterSelect
            value={filterYear}
            onChange={(v) => { setFilterYear(v); if (!v) setFilterMonth('') }}
            placeholder="This Week"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterSelect>

          {/* Month dropdown — only active once a year is picked */}
          {filterYear && (
            <FilterSelect
              value={filterMonth}
              onChange={setFilterMonth}
              placeholder="All months"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </FilterSelect>
          )}

          {/* Total hours badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
            <span className="text-sm font-bold text-white">{totalHours}h</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="day"
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(79,70,229,0.3)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#hoursGradient)"
            dot={isMonthView ? false : { fill: '#6366f1', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
