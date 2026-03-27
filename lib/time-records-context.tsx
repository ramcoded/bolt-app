'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { TimeRecord } from './mock-data'
import { createClient } from '@/lib/supabase/client'

type TimeRecordsCtx = {
  records:  TimeRecord[]
  timedIn:  boolean
  activeId: string | null
  loading:  boolean
  clockIn:  () => Promise<void>
  clockOut: () => Promise<void>
}

const TimeRecordsContext = createContext<TimeRecordsCtx | null>(null)

function mapRow(r: any): TimeRecord {
  return {
    id:       r.id,
    date:     r.date,
    timeIn:   r.time_in,
    timeOut:  r.time_out ?? null,
    duration: r.duration ?? null,
  }
}

export function TimeRecordsProvider({ children }: { children: ReactNode }) {
  const [records,  setRecords]  = useState<TimeRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)

  const timedIn = activeId !== null

  // Initial fetch
  useEffect(() => {
    fetch('/api/time-records')
      .then((r) => r.json())
      .then((data: TimeRecord[]) => {
        const safe = Array.isArray(data) ? data : []
        setRecords(safe)
        const active = safe.find((r) => r.timeOut === null)
        if (active) setActiveId(active.id)
      })
      .finally(() => setLoading(false))
  }, [])

  // Realtime subscription — updates timeline and dashboard in real time across all tabs/devices
  useEffect(() => {
    const supabase = createClient()
    let channelRef: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channelRef = supabase
        .channel(`time-records-${user.id}`)
        .on('postgres_changes' as any, {
          event: 'INSERT', schema: 'public', table: 'time_records',
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          const rec = mapRow(payload.new)
          setRecords((prev) => prev.find((r) => r.id === rec.id) ? prev : [rec, ...prev])
          if (!rec.timeOut) setActiveId(rec.id)
        })
        .on('postgres_changes' as any, {
          event: 'UPDATE', schema: 'public', table: 'time_records',
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          const rec = mapRow(payload.new)
          setRecords((prev) => prev.map((r) => r.id === rec.id ? rec : r))
          if (rec.timeOut) setActiveId((prev) => prev === rec.id ? null : prev)
        })
        .on('postgres_changes' as any, {
          event: 'DELETE', schema: 'public', table: 'time_records',
          filter: `user_id=eq.${user.id}`,
        }, (payload: any) => {
          setRecords((prev) => prev.filter((r) => r.id !== payload.old.id))
          setActiveId((prev) => prev === payload.old.id ? null : prev)
        })
        .subscribe()
    })

    return () => {
      if (channelRef) supabase.removeChannel(channelRef)
    }
  }, [])

  const clockIn = async () => {
    const res  = await fetch('/api/time-records', { method: 'POST' })
    const data: TimeRecord = await res.json()
    setRecords((prev) => [data, ...prev])
    setActiveId(data.id)
  }

  const clockOut = async () => {
    if (!activeId) return
    const res  = await fetch(`/api/time-records/${activeId}`, { method: 'PATCH' })
    const data: TimeRecord = await res.json()
    setRecords((prev) => prev.map((r) => (r.id === activeId ? data : r)))
    setActiveId(null)
  }

  return (
    <TimeRecordsContext.Provider value={{ records, timedIn, activeId, loading, clockIn, clockOut }}>
      {children}
    </TimeRecordsContext.Provider>
  )
}

export function useTimeRecords() {
  const ctx = useContext(TimeRecordsContext)
  if (!ctx) throw new Error('useTimeRecords must be used within TimeRecordsProvider')
  return ctx
}
