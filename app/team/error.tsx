'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-white/40 text-sm mb-6">An error occurred loading the team page.</p>
      <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--bolt-accent)' }}>
        Try again
      </button>
    </div>
  )
}
