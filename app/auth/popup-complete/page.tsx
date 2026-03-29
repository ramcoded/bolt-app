'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PopupComplete() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: 'GOOGLE_AUTH_SUCCESS', redirectTo },
        window.location.origin
      )
      window.close()
    } else {
      // Not a popup — just navigate normally
      window.location.href = redirectTo
    }
  }, [redirectTo])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#05050a' }}
    >
      <p className="text-sm text-white/40">Completing sign in…</p>
    </div>
  )
}

export default function PopupCompletePage() {
  return (
    <Suspense>
      <PopupComplete />
    </Suspense>
  )
}
