'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
      <p className="text-white/40 text-sm mb-6">An unexpected error occurred. Please try again.</p>
      <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--bolt-accent)' }}>
        Try again
      </button>
    </div>
  )
}
