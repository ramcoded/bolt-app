'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { TimeRecordsProvider } from '@/lib/time-records-context'
import { PresenceProvider } from '@/lib/presence-context'
import NavBar from '@/components/NavBar'
import ChatTabs from '@/components/Chat/ChatTabs'
import NotesPanel from '@/components/NotesPanel'
import { ToastProvider } from '@/components/Toast'

// Renders children only on the client to prevent hydration mismatches
// caused by browser extensions (Dark Reader, etc.) modifying the DOM.
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
    <PresenceProvider key={user?.id ?? 'guest'}>
      <TimeRecordsProvider key={user?.id ?? 'guest'}>
        <ToastProvider>
          <ClientOnly>
            <NavBar />
          </ClientOnly>
          <main className="min-h-[calc(100vh-4rem)] pb-16" suppressHydrationWarning>
            <ClientOnly>{children}</ClientOnly>
          </main>
          <ClientOnly>
            {!pathname.startsWith('/team') && <ChatTabs />}
          </ClientOnly>
          <ClientOnly>
            <NotesPanel />
          </ClientOnly>
        </ToastProvider>
      </TimeRecordsProvider>
    </PresenceProvider>
  )
}
