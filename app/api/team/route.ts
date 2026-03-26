import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function mapMember(m: any) {
  return {
    id:       m.id,
    name:     m.name,
    role:     m.role,
    avatar:   m.avatar ?? m.name?.slice(0, 2).toUpperCase() ?? '??',
    online:   m.online ?? false,
    lastSeen: m.last_seen ?? undefined,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, avatar, online, last_seen')
    .neq('id', user.id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map(mapMember))
}
