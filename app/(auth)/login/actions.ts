'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { rateLimit } from '@/lib/rate-limit'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function login(formData: FormData) {
  // Rate limit: 5 attempts per minute per IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!await rateLimit(`login:${ip}`, 5, 60 * 1000)) {
    return { error: 'Too many login attempts. Please try again later.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email:    formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: 'Invalid email or password' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  // Use admin client to bypass RLS for presence update
  await adminClient()
    .from('profiles')
    .update({ online: true, last_seen: new Date().toISOString() })
    .eq('id', data.user.id)

  redirect(profile?.role === 'manager' ? '/manager/dashboard' : '/')
}
