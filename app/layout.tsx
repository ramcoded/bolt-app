import 'server-only'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Profile } from '@/lib/auth-context'
import NextTopLoader from 'nextjs-toploader'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

    if (data) {
      profile = data
    } else {
      // Profile row missing — create one (handles accounts created before the signup trigger)
      const name = (user.user_metadata?.full_name as string | undefined)
        ?? (user.user_metadata?.name as string | undefined)
        ?? user.email
        ?? 'User'
      const isOAuth = user.app_metadata?.provider !== 'email'
      const avatar = (user.user_metadata?.avatar_url as string | undefined)
        ?? (user.user_metadata?.picture as string | undefined)
        ?? name.slice(0, 2).toUpperCase()
      const admin = getAdmin()
      const { data: created } = await admin
        .from('profiles')
        .insert({ id: user.id, name, avatar, role: isOAuth ? 'manager' : 'member' })
        .select()
        .single()
      profile = created
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader
          color="#6366f1"
          height={2}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #6366f1, 0 0 5px #4f46e5"
        />
        <AuthProvider initialUser={user} initialProfile={profile}>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
