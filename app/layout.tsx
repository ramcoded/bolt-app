import type { Metadata } from 'next'
import './globals.css'
import NavBar from '@/components/NavBar'
import ChatTabs from '@/components/Chat/ChatTabs'
import { TimeRecordsProvider } from '@/lib/time-records-context'

export const metadata: Metadata = {
  title: 'BOLT',
  description: 'Team time tracking and collaboration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <TimeRecordsProvider>
          <NavBar />
          <main className="min-h-[calc(100vh-4rem)] pb-16">
            {children}
          </main>
          <ChatTabs />
        </TimeRecordsProvider>
      </body>
    </html>
  )
}
