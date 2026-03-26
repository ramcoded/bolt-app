import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function verifyManager(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return data?.role === 'manager'
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await verifyManager(supabase, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const admin = getAdmin()
  const { data: authUser, error } = await admin.auth.admin.getUserById(userId)
  if (error || !authUser) return NextResponse.json({ schedule: [] })

  const schedule = (authUser.user.user_metadata?.schedule ?? []) as Array<{
    day: number; timeIn: string; timeOut: string
  }>

  return NextResponse.json({ schedule })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await verifyManager(supabase, user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, schedule } = await request.json()
  if (!userId || !Array.isArray(schedule)) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const admin = getAdmin()

  // Preserve existing metadata, merge in the schedule
  const { data: authUser, error: fetchError } = await admin.auth.admin.getUserById(userId)
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  const existingMeta = authUser.user.user_metadata ?? {}
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...existingMeta, schedule },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
