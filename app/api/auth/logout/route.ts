import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin
      .from('profiles')
      .update({ online: false, last_seen: new Date().toISOString() })
      .eq('id', user.id)
  }
  await supabase.auth.signOut()
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  )
}
