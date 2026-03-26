import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'BOLT',
  description: 'Team time tracking and collaboration',
}

// Tells Dark Reader the site is already dark — prevents it from injecting
// --darkreader-* CSS custom properties that cause hydration mismatches.
export const viewport: Viewport = {
  colorScheme: 'dark',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider initialUser={user} initialProfile={profile}>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
