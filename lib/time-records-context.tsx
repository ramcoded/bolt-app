'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { TimeRecord, timeRecords as initialRecords } from './mock-data'
import { formatTime24, toDateStr } from './time-utils'

type TimeRecordsCtx = {
  records: TimeRecord[]
  timedIn: boolean
  clockIn: () => void
  clockOut: () => void
}

const TimeRecordsContext = createContext<TimeRecordsCtx | null>(null)

export function TimeRecordsProvider({ children }: { children: ReactNode }) {
  const [records,  setRecords]  = useState<TimeRecord[]>(initialRecords)
  const [timedIn,  setTimedIn]  = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const clockIn = () => {
    const now = new Date()
    const id  = `live-${Date.now()}`
    setRecords((prev) => [
      { id, date: toDateStr(now), timeIn: formatTime24(now).slice(0, 5), timeOut: null, duration: null },
      ...prev,
    ])
    setActiveId(id)
    setTimedIn(true)
  }

  const clockOut = () => {
    const now     = new Date()
    const outTime = formatTime24(now).slice(0, 5)
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== activeId) return r
        const [inH, inM]   = r.timeIn.split(':').map(Number)
        const [outH, outM] = outTime.split(':').map(Number)
        return { ...r, timeOut: outTime, duration: outH * 60 + outM - (inH * 60 + inM) }
      })
    )
    setActiveId(null)
    setTimedIn(false)
  }

  return (
    <TimeRecordsContext.Provider value={{ records, timedIn, clockIn, clockOut }}>
      {children}
    </TimeRecordsContext.Provider>
  )
}

export function useTimeRecords() {
  const ctx = useContext(TimeRecordsContext)
  if (!ctx) throw new Error('useTimeRecords must be used within TimeRecordsProvider')
  return ctx
}
