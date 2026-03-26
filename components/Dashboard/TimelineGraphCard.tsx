'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { weeklyHours } from '@/lib/mock-data'
import { TrendingUp } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <p className="text-white/60">{label}</p>
        <p className="text-[#c0392b] font-semibold">{payload[0].value}h logged</p>
      </div>
    )
  }
  return null
}

export default function TimelineGraphCard() {
  const totalHours = weeklyHours.reduce((s, d) => s + d.hours, 0).toFixed(1)

  return (
    <div className="glass-card p-5 col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Weekly Overview</h2>
          <p className="text-xs text-white/40 mt-0.5">Hours logged this week</p>
        </div>
        <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-xl">
          <TrendingUp className="w-3.5 h-3.5 text-[#c0392b]" />
          <span className="text-sm font-bold text-white">{totalHours}h</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={weeklyHours} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#8B1A1A" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#8B1A1A" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="day"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(139,26,26,0.3)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="hours"
            stroke="#c0392b"
            strokeWidth={2}
            fill="url(#hoursGradient)"
            dot={{ fill: '#c0392b', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#c0392b', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
