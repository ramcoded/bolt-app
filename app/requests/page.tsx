'use client'

import { useState, useEffect } from 'react'
import {
  ClipboardList, Clock, CalendarDays, FileText,
  CheckCircle2, XCircle, Loader2, Send, ChevronDown, Info, Minus, Plus,
} from 'lucide-react'

type RequestType = 'overtime' | 'pre_shift_overtime' | 'leave'

type LeaveRequest = {
  id: string
  type: RequestType
  date: string
  hours: number | null
  reason: string
  status: 'pending' | 'granted' | 'rejected'
  reviewerNote: string | null
  createdAt: string
}

type ScheduleEntry    = { day: number; timeIn: string; timeOut: string }
type ScheduleOverride = { date: string; type: string; timeIn: string | null; timeOut: string | null }

const TYPE_OPTIONS: { value: RequestType; label: string; description: string }[] = [
  { value: 'overtime',           label: 'Overtime',          description: 'Extra hours worked after your regular shift ends'         },
  { value: 'pre_shift_overtime', label: 'Pre-Shift Overtime', description: 'Extra hours worked before your regular shift starts'     },
  { value: 'leave',              label: 'Time Off / Leave',   description: 'Full day absence from work'                              },
]

const TYPE_LABELS: Record<RequestType, string> = {
  overtime:           'Overtime',
  pre_shift_overtime: 'Pre-Shift OT',
  leave:              'Time Off',
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  granted:  { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
}

const TYPE_COLOR: Record<RequestType, string> = {
  overtime:           '#6366f1',
  pre_shift_overtime: '#8b5cf6',
  leave:              '#06b6d4',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function shiftTime(time: string, deltaHours: number): string {
  const [h, m] = time.split(':').map(Number)
  let totalMins = h * 60 + m + Math.round(deltaHours * 60)
  totalMins = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60)
  return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`
}

function cardStyle(extra?: object) {
  return {
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    ...extra,
  }
}

function getBaseSchedule(dateStr: string, schedule: ScheduleEntry[]) {
  const dayIndex = new Date(dateStr + 'T00:00:00').getDay()
  return schedule.find(s => s.day === dayIndex) ?? null
}

function getEffectiveSchedule(
  dateStr: string,
  schedule: ScheduleEntry[],
  overrides: ScheduleOverride[],
) {
  const override = overrides.find(o => o.date === dateStr)
  if (override) return { timeIn: override.timeIn, timeOut: override.timeOut, isOverride: true, overrideType: override.type }
  const base = getBaseSchedule(dateStr, schedule)
  if (base) return { timeIn: base.timeIn, timeOut: base.timeOut, isOverride: false }
  return { timeIn: null, timeOut: null, isOverride: false }
}

// Preview what the resulting schedule will look like if approved
function previewSchedule(
  type: RequestType,
  hours: number,
  dateStr: string,
  schedule: ScheduleEntry[],
): { timeIn: string; timeOut: string } | null {
  if (!dateStr || type === 'leave') return null
  const base = getBaseSchedule(dateStr, schedule)
  if (!base) return null
  if (type === 'overtime')           return { timeIn: base.timeIn, timeOut: shiftTime(base.timeOut, hours) }
  if (type === 'pre_shift_overtime') return { timeIn: shiftTime(base.timeIn, -hours), timeOut: base.timeOut }
  return null
}

export default function RequestsPage() {
  const today = new Date().toISOString().slice(0, 10)

  const [schedule,  setSchedule]  = useState<ScheduleEntry[]>([])
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([])

  const [type,        setType]        = useState<RequestType>('overtime')
  const [date,        setDate]        = useState('')
  const [hours,       setHours]       = useState(1)
  const [reason,      setReason]      = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [formError,   setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState(false)

  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const needsHours = type !== 'leave'

  const currentSchedule  = date ? getEffectiveSchedule(date, schedule, overrides) : null
  const baseForDate       = date ? getBaseSchedule(date, schedule) : null
  const schedulePreview   = needsHours && date && hours > 0
    ? previewSchedule(type, hours, date, schedule)
    : null

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/requests')
      const data = await res.json()
      if (Array.isArray(data)) setRequests(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch('/api/schedules')
      .then(r => r.json())
      .then(d => { setSchedule(d.schedule ?? []); setOverrides(d.overrides ?? []) })
    loadRequests()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess(false)
    if (!date)               { setFormError('Please select a date.');                             return }
    if (date < today)        { setFormError('Cannot submit requests for past dates.');            return }
    if (needsHours && hours <= 0) { setFormError('Please enter valid OT hours.');                return }
    if (!reason.trim())      { setFormError('Please provide a reason.');                         return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, date, hours: needsHours ? hours : undefined, reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Failed to submit request.'); return }
      setFormSuccess(true)
      setDate(''); setHours(1); setReason('')
      await loadRequests()
      setTimeout(() => setFormSuccess(false), 4000)
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const pending  = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  const inputBase: React.CSSProperties = {
    background:   'rgba(255,255,255,0.05)',
    border:       '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    color:        '#fff',
    outline:      'none',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Requests</h1>
        <p className="text-sm text-white/40 mt-1">Apply for overtime or time off, and track your request status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Apply Form ─────────────────────────────────── */}
        <div style={cardStyle({ padding: 24 })}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Send className="w-4 h-4" style={{ color: '#6366f1' }} />
            </div>
            <h2 className="text-base font-semibold text-white">New Request</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Type selector */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">Request Type</label>
              <div className="flex flex-col gap-2">
                {TYPE_OPTIONS.map((opt) => {
                  const active = type === opt.value
                  return (
                    <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                      className="text-left transition-all duration-150"
                      style={{
                        background:   active ? `${TYPE_COLOR[opt.value]}18` : 'rgba(255,255,255,0.03)',
                        border:       `1px solid ${active ? TYPE_COLOR[opt.value] + '55' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 10, padding: '10px 14px',
                      }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: active ? TYPE_COLOR[opt.value] : 'rgba(255,255,255,0.7)' }}>
                          {opt.label}
                        </span>
                        {active && <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLOR[opt.value] }} />}
                      </div>
                      <p className="text-xs text-white/35 mt-0.5">{opt.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                <input type="date" value={date} min={today}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm"
                  style={{ ...inputBase, colorScheme: 'dark' }} required />
              </div>

              {/* Current schedule info for selected date */}
              {date && (
                <div className="mt-2 flex items-start gap-2 px-3 py-2.5 rounded-lg"
                  style={{
                    background: currentSchedule?.isOverride ? 'rgba(6,182,212,0.07)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${currentSchedule?.isOverride ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                    style={{ color: currentSchedule?.isOverride ? '#06b6d4' : 'rgba(255,255,255,0.3)' }} />
                  <div>
                    <p className="text-xs font-medium"
                      style={{ color: currentSchedule?.isOverride ? '#06b6d4' : 'rgba(255,255,255,0.5)' }}>
                      {currentSchedule?.isOverride
                        ? `Override already exists (${currentSchedule.overrideType?.replace(/_/g, ' ')})`
                        : 'Your schedule for this day'}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {currentSchedule?.timeIn && currentSchedule?.timeOut
                        ? `${currentSchedule.timeIn} – ${currentSchedule.timeOut}`
                        : currentSchedule?.isOverride
                        ? 'Day off (leave)'
                        : 'No scheduled shift — OT times will depend on your base schedule'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Hours input — only for OT types */}
            {needsHours && (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Hours of Overtime
                </label>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setHours(h => Math.max(0.5, Math.round((h - 0.5) * 2) / 2))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-white">{hours}</span>
                    <span className="text-sm text-white/40 ml-1">{hours === 1 ? 'hour' : 'hours'}</span>
                  </div>

                  <button type="button"
                    onClick={() => setHours(h => Math.min(12, Math.round((h + 0.5) * 2) / 2))}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Live schedule preview */}
                {schedulePreview && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: `${TYPE_COLOR[type]}10`, border: `1px solid ${TYPE_COLOR[type]}30` }}>
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: TYPE_COLOR[type] }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: TYPE_COLOR[type] }}>
                        Resulting schedule if approved
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {baseForDate
                          ? `${baseForDate.timeIn} – ${baseForDate.timeOut}  →  ${schedulePreview.timeIn} – ${schedulePreview.timeOut}`
                          : `${schedulePreview.timeIn} – ${schedulePreview.timeOut}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Reason</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-white/30 pointer-events-none" />
                <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                  rows={3} placeholder="Briefly explain the reason for your request…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm resize-none"
                  style={{ ...inputBase, fontFamily: 'inherit' }} maxLength={1000} />
              </div>
            </div>

            {formError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
              </p>
            )}
            {formSuccess && (
              <p className="text-xs text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />Request submitted successfully!
              </p>
            )}

            <button type="submit" disabled={submitting}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mt-1"
              style={{
                background: submitting ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.85)',
                color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 0 16px rgba(99,102,241,0.3)',
              }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* ── My Requests ────────────────────────────────── */}
        <div style={{ ...cardStyle(), padding: 24 }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <ClipboardList className="w-4 h-4" style={{ color: '#6366f1' }} />
            </div>
            <h2 className="text-base font-semibold text-white">My Requests</h2>
            {requests.length > 0 && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                {requests.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ClipboardList className="w-8 h-8 text-white/15" />
              <p className="text-sm text-white/30">No requests yet</p>
              <p className="text-xs text-white/20">Submit a request using the form</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
              {pending.length > 0 && (
                <>
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-1">Pending</p>
                  {pending.map(req => <RequestCard key={req.id} req={req} expanded={expanded} setExpanded={setExpanded} />)}
                </>
              )}
              {resolved.length > 0 && (
                <>
                  <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-1 mt-2">Resolved</p>
                  {resolved.map(req => <RequestCard key={req.id} req={req} expanded={expanded} setExpanded={setExpanded} />)}
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function RequestCard({
  req, expanded, setExpanded,
}: {
  req: LeaveRequest
  expanded: string | null
  setExpanded: (id: string | null) => void
}) {
  const sc     = STATUS_CONFIG[req.status]
  const isOpen = expanded === req.id

  return (
    <div className="transition-all duration-150"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
      <button type="button" className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={() => setExpanded(isOpen ? null : req.id)}>
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: TYPE_COLOR[req.type] }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-white/90 truncate">{TYPE_LABELS[req.type]}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {sc.label}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {formatDate(req.date)}
            {req.hours ? ` · ${req.hours}h OT` : ''}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-white/25 flex-shrink-0 mt-0.5 transition-transform duration-150"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-1 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p className="text-xs text-white/35 mb-1 uppercase tracking-wider">Reason</p>
            <p className="text-sm text-white/70 leading-relaxed">{req.reason}</p>
          </div>
          {req.status === 'granted' && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 mt-1"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              <p className="text-xs text-green-400">Schedule updated for {formatDate(req.date)}</p>
            </div>
          )}
          {req.reviewerNote && (
            <div className="rounded-lg p-3 mt-1"
              style={{
                background: req.status === 'granted' ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                border: `1px solid ${req.status === 'granted' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}>
              <p className="text-xs font-medium mb-0.5" style={{ color: req.status === 'granted' ? '#22c55e' : '#ef4444' }}>
                {req.status === 'granted' ? 'Approval Note' : 'Rejection Reason'}
              </p>
              <p className="text-xs text-white/60">{req.reviewerNote}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
