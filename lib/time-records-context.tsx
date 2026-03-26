'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { TimeRecord } from './mock-data'

type TimeRecordsCtx = {
  records:  TimeRecord[]
  timedIn:  boolean
  activeId: string | null
  loading:  boolean
  clockIn:  () => Promise<void>
  clockOut: () => Promise<void>
}

const TimeRecordsContext = createContext<TimeRecordsCtx | null>(null)

export function TimeRecordsProvider({ children }: { children: ReactNode }) {
  const [records,  setRecords]  = useState<TimeRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(true)

  const timedIn = activeId !== null

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
