import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const postSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  role: z.enum(['manager', 'member']),
  department: z.string().max(200).nullable().optional(),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', user.id)
    .single()
  if (me?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Rate limit: 10 invites per hour per manager
  if (!await rateLimit(`invite:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many invites. Please try again later.' }, { status: 429 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { email, name, role, department } = result.data
  const teamId = me?.team_id ?? null
  const admin = getAdmin()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role, department: department || null, team_id: teamId },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin}/set-password`,
  })

  if (error) {
    logError('manager/invite/POST', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 400 })
  }

  // Pre-create profile so the member shows up immediately in the dashboard,
  // and assign them to the same team as the inviting manager.
  if (data.user) {
    await admin.from('profiles').upsert({
      id:         data.user.id,
      name,
      role,
      department: department || null,
      avatar:     name.slice(0, 2).toUpperCase(),
      online:     false,
      team_id:    teamId,
    })
  }

  return NextResponse.json({ success: true })
}
