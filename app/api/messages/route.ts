import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function mapMessage(m: any, meId: string) {
  return {
    id:        m.id,
    senderId:  m.sender_id === meId ? 'me' : m.sender_id,
    content:   m.content,
    timestamp: new Date(m.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }),
    read: m.read,
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withId = searchParams.get('with')
  if (!withId) return NextResponse.json({ error: 'Missing with param' }, { status: 400 })

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${withId}),and(sender_id.eq.${withId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark received messages as read
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', user.id)
    .eq('sender_id', withId)
    .eq('read', false)

  return NextResponse.json((data ?? []).map((m) => mapMessage(m, user.id)))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { receiver_id, content } = await request.json()
  if (!receiver_id || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: user.id, receiver_id, content })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapMessage(data, user.id))
}
