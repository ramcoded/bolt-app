import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function mapMessage(m: Record<string, unknown>, meId: string) {
  return {
    id:        m.id,
    senderId:  m.sender_id === meId ? 'me' : m.sender_id,
    content:   m.content,
    timestamp: new Date(m.created_at as string).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }),
    read: m.read,
  }
}

const postSchema = z.object({
  receiver_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
})

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const withId = searchParams.get('with')
  if (!withId) return NextResponse.json({ error: 'Missing with param' }, { status: 400 })

  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0)

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${withId}),and(sender_id.eq.${withId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    logError('messages/GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

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

  // Rate limit: 60 messages per minute per user
  if (!await rateLimit(`messages:${user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { receiver_id, content } = result.data

  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: user.id, receiver_id, content })
    .select()
    .single()

  if (error) {
    logError('messages/POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Create a notification for the receiver (skip self-messages)
  if (receiver_id !== user.id) {
    try {
      const { data: sender } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      const senderName = sender?.name ?? 'Someone'
      const preview    = content.length > 80 ? content.slice(0, 80) + '…' : content

      await adminClient().from('notifications').insert({
        user_id:     receiver_id,
        title:       `New message from ${senderName}`,
        description: preview,
        type:        'message',
        read:        false,
      })
    } catch { /* non-critical — message was still sent */ }
  }

  return NextResponse.json(mapMessage(data, user.id))
}
