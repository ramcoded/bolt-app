import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Schedule is stored in auth user_metadata — no extra table needed
  const schedule = (user.user_metadata?.schedule ?? []) as Array<{
    day: number; timeIn: string; timeOut: string
  }>

  return NextResponse.json({ schedule })
}
