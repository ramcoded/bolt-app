'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import NavBar from '@/components/NavBar'
import ChatTabs from '@/components/Chat/ChatTabs'
import { TimeRecordsProvider } from '@/lib/time-records-context'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const pathname  = usePathname()

  if (!user) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <TimeRecordsProvider>
      <NavBar />
      <main className="min-h-[calc(100vh-4rem)] pb-16">{children}</main>
      {!pathname.startsWith('/team') && <ChatTabs />}
    </TimeRecordsProvider>
  )
}
