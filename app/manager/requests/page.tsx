'use client'

import { useState, useEffect } from 'react'
import {
  ClipboardList, Clock, CalendarDays, CheckCircle2, XCircle,
  Loader2, ChevronDown, MessageSquare, User,
} from 'lucide-react'

type RequestType = 'overtime' | 'pre_shift_overtime' | 'leave'

type MemberRequest = {
  id: string
  type: RequestType
  date: string
  hours: number | null
  reason: string
  status: 'pending' | 'granted' | 'rejected'
  reviewerNote: string | null
  createdAt: string
  member: { id: string; name: string; avatar: string | null }
}

const TYPE_LABELS: Record<RequestType, string> = {
  overtime:           'Overtime',
  pre_shift_overtime: 'Pre-Shift OT',
  leave:              'Time Off',
}

const TYPE_COLOR: Record<RequestType, string> = {
  overtime:           '#6366f1',
  pre_shift_overtime: '#8b5cf6',
  leave:              '#06b6d4',
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)'  },
  granted:  { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function cardStyle(extra?: object) {
  return {
    background:   'rgba(255,255,255,0.03)',
    border:       '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    ...extra,
  }
}

export default function ManagerRequestsPage() {
  const [tab,      setTab]      = useState<'pending' | 'all'>('pending')
  const [requests, setRequests] = useState<MemberRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadRequests = async (status: 'pending' | 'all') => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/manager/requests?status=${status === 'all' ? 'all' : 'pending'}`)
      const data = await res.json()
      if (Array.isArray(data)) setRequests(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRequests(tab) }, [tab])

  const handleReview = async (id: string, action: 'grant' | 'reject', note: string) => {
    const res = await fetch('/api/manager/requests', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, action, note }),
    })
    if (res.ok) {
      setExpanded(null)
      await loadRequests(tab)
    }
  }

  const pending  = requests.filter(r => r.status === 'pending')
  const resolved = requests.filter(r => r.status !== 'pending')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Review Requests</h1>
        <p className="text-sm text-white/40 mt-1">Approve or reject overtime and leave requests from your team.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {(['pending', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={tab === t
              ? { background: 'rgba(99,102,241,0.25)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.35)' }
              : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }}>
            {t === 'pending' ? 'Pending' : 'All Requests'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : requests.length === 0 ? (
        <div style={cardStyle({ padding: 48 })} className="flex flex-col items-center gap-3">
          <ClipboardList className="w-10 h-10 text-white/15" />
          <p className="text-sm text-white/30">
            {tab === 'pending' ? 'No pending requests' : 'No requests found'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tab === 'pending' || pending.length > 0 ? null : null}

          {tab === 'all' && pending.length > 0 && (
            <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-1">Pending</p>
          )}
          {(tab === 'pending' ? requests : pending).map(req => (
            <RequestRow key={req.id} req={req} expanded={expanded} setExpanded={setExpanded} onReview={handleReview} />
          ))}

          {tab === 'all' && resolved.length > 0 && (
            <>
              <p className="text-xs font-medium text-white/30 uppercase tracking-wider px-1 mt-2">Resolved</p>
              {resolved.map(req => (
                <RequestRow key={req.id} req={req} expanded={expanded} setExpanded={setExpanded} onReview={handleReview} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RequestRow({
  req, expanded, setExpanded, onReview,
}: {
  req: MemberRequest
  expanded: string | null
  setExpanded: (id: string | null) => void
  onReview: (id: string, action: 'grant' | 'reject', note: string) => Promise<void>
}) {
  const [note,       setNote]       = useState('')
  const [submitting, setSubmitting] = useState<'grant' | 'reject' | null>(null)
  const sc     = STATUS_CONFIG[req.status]
  const isOpen = expanded === req.id

  const submit = async (action: 'grant' | 'reject') => {
    setSubmitting(action)
    await onReview(req.id, action, note)
    setSubmitting(null)
    setNote('')
  }

  return (
    <div className="transition-all duration-150"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>

      <button type="button" className="w-full text-left px-4 py-3.5 flex items-start gap-3"
        onClick={() => setExpanded(isOpen ? null : req.id)}>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
          {req.member.avatar
            ? <img src={req.member.avatar} alt="" className="w-full h-full object-cover" />
            : <User className="w-4 h-4" style={{ color: '#818cf8' }} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-white/90 truncate">{req.member.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{ background: `${TYPE_COLOR[req.type]}15`, color: TYPE_COLOR[req.type], border: `1px solid ${TYPE_COLOR[req.type]}30` }}>
                {TYPE_LABELS[req.type]}
              </span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
              {sc.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-white/40">
              <CalendarDays className="w-3 h-3" />{formatDate(req.date)}
            </span>
            {req.hours && (
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="w-3 h-3" />{req.hours}h OT
              </span>
            )}
          </div>
        </div>

        <ChevronDown className="w-4 h-4 text-white/25 flex-shrink-0 mt-1 transition-transform duration-150"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Reason */}
          <div>
            <p className="text-xs text-white/35 mb-1 uppercase tracking-wider">Reason</p>
            <p className="text-sm text-white/70 leading-relaxed">{req.reason}</p>
          </div>

          {/* Reviewer note (if already reviewed) */}
          {req.status !== 'pending' && req.reviewerNote && (
            <div className="rounded-lg p-3"
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

          {/* Action panel — only for pending */}
          {req.status === 'pending' && (
            <div className="flex flex-col gap-2 pt-1">
              <div className="relative">
                <MessageSquare className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  placeholder="Optional note to the member…"
                  className="w-full pl-8 pr-3 py-2 text-xs resize-none rounded-xl"
                  style={{
                    background:   'rgba(255,255,255,0.05)',
                    border:       '1px solid rgba(255,255,255,0.1)',
                    color:        '#fff',
                    outline:      'none',
                    fontFamily:   'inherit',
                  }}
                  maxLength={500}
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => submit('grant')} disabled={!!submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={{
                    background: submitting ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.2)',
                    color:      '#22c55e',
                    border:     '1px solid rgba(34,197,94,0.3)',
                    cursor:     submitting ? 'not-allowed' : 'pointer',
                  }}>
                  {submitting === 'grant'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>

                <button onClick={() => submit('reject')} disabled={!!submitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={{
                    background: submitting ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.15)',
                    color:      '#ef4444',
                    border:     '1px solid rgba(239,68,68,0.25)',
                    cursor:     submitting ? 'not-allowed' : 'pointer',
                  }}>
                  {submitting === 'reject'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
