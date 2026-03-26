'use client'

import Link from 'next/link'
import { Mail, Briefcase, Calendar, Clock, TrendingUp, LogIn } from 'lucide-react'
import { useTimeRecords } from '@/lib/time-records-context'
import { useAuth } from '@/lib/auth-context'
import { formatDate, formatDuration } from '@/lib/time-utils'

export default function ProfilePage() {
  const { records } = useTimeRecords()
  const { user, profile } = useAuth()

  const completed    = records.filter((r) => r.duration !== null)
  const totalMins    = completed.reduce((s, r) => s + (r.duration ?? 0), 0)
  const avgMins      = completed.length ? Math.round(totalMins / completed.length) : 0
  const recentFive   = records.slice(0, 5)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      {/* Cover + identity */}
      <div className="glass-card overflow-hidden">
        <div
          className="h-44 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.35) 0%, rgba(99,102,241,0.18) 50%, rgba(5,5,10,0.9) 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(ellipse at 25% 60%, rgba(79,70,229,0.25) 0%, transparent 65%)' }}
          />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-10 mb-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white border-4 flex-shrink-0"
              style={{
                background:  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                borderColor: '#0a0a0f',
                boxShadow:   '0 0 28px rgba(79,70,229,0.55)',
              }}
            >
              {profile?.avatar ?? '??'}
            </div>
            <Link href="/" className="btn-ghost text-sm">← Dashboard</Link>
          </div>

          <h1 className="text-2xl font-bold text-white">{profile?.name ?? '—'}</h1>
          <p className="text-sm text-white/50 mt-0.5">{profile?.role} · {profile?.department}</p>

          <div className="flex flex-wrap items-center gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <Mail className="w-3.5 h-3.5" />{user?.email ?? '—'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <Briefcase className="w-3.5 h-3.5" />{profile?.department ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Hours',  value: formatDuration(totalMins),       icon: Clock       },
          { label: 'Days Logged',  value: `${completed.length} days`,      icon: Calendar    },
          { label: 'Avg / Day',    value: formatDuration(avgMins),         icon: TrendingUp  },
          { label: 'All Records',  value: `${records.length} entries`,     icon: LogIn       },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4" style={{ color: '#6366f1' }} />
              <span className="text-xs text-white/40">{label}</span>
            </div>
            <p className="text-lg font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {recentFive.map((record, i) => {
            const isActive = record.timeOut === null
            return (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl animate-fade-in"
                style={{
                  background:       'rgba(255,255,255,0.03)',
                  border:           '1px solid rgba(255,255,255,0.06)',
                  animationDelay:   `${i * 60}ms`,
                  animationFillMode: 'both',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: isActive ? '#4ade80' : '#6366f1' }}
                  />
                  <p className="text-sm font-medium text-white">{formatDate(record.date)}</p>
                  <span className="text-xs text-white/30">{record.date}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-green-400">{record.timeIn}</span>
                  <span className="text-white/25">→</span>
                  <span style={{ color: isActive ? '#4ade80' : '#6366f1' }}>
                    {record.timeOut ?? 'Active'}
                  </span>
                  {record.duration !== null && (
                    <span className="text-white/40">{formatDuration(record.duration)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
