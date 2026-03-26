'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { TimeRecordsProvider } from '@/lib/time-records-context'
import { PresenceProvider } from '@/lib/presence-context'

// Skip SSR for UI chrome so browser extensions (Dark Reader, etc.)
// cannot cause hydration mismatches by modifying the DOM before React loads.
const NavBar   = dynamic(() => import('@/components/NavBar'),        { ssr: false })
const ChatTabs = dynamic(() => import('@/components/Chat/ChatTabs'), { ssr: false })

// Renders children only after the first client-side paint so that inline
// styles on any page component cannot mismatch server-rendered HTML.
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted ? <>{children}</> : null
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user }  = useAuth()
  const pathname  = usePathname()

  if (!user) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <PresenceProvider>
      <TimeRecordsProvider>
        <NavBar />
        <main className="min-h-[calc(100vh-4rem)] pb-16">
          <ClientOnly>{children}</ClientOnly>
        </main>
        {!pathname.startsWith('/team') && <ChatTabs />}
      </TimeRecordsProvider>
    </PresenceProvider>
  )
}
