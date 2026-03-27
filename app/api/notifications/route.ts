import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/logger'

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    logError('notifications/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const mapped = (data ?? []).map((n: any) => ({
    id:          n.id,
    title:       n.title,
    description: n.description,
    type:        n.type,
    read:        n.read,
    time:        formatRelativeTime(n.created_at),
  }))

  return NextResponse.json(mapped)
}
