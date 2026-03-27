import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    logError('notifications/[id]/read/PATCH', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  return NextResponse.json(data)
}
