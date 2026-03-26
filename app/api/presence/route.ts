import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { online } = await request.json()

  await supabase
    .from('profiles')
    .update({ online: online ?? true, last_seen: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
