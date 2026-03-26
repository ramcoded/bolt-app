import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, role, department } = await request.json()
  if (!email || !name || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (!['manager', 'employee'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const admin = getAdmin()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name, role, department: department || null },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Pre-create profile so the member shows up immediately in the dashboard
  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      name,
      role,
      department: department || null,
      avatar: name.slice(0, 2).toUpperCase(),
      online: false,
    })
  }

  return NextResponse.json({ success: true })
}
