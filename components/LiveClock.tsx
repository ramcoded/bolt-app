'use client'

import { useEffect, useState } from 'react'
import { formatTime24 } from '@/lib/time-utils'

export default function LiveClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(formatTime24(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-sm font-semibold text-white/80 tabular-nums tracking-wider">
      {time || '00:00:00'}
    </span>
  )
}
