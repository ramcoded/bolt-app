import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logError, logInfo } from '@/lib/logger'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  content: z.string().min(1).max(5000),
})

type RawMessage = {
  id: string
  team_id: string
  sender_id: string
  content: string
  created_at: string
}

type Profile = {
  id: string
  name: string
  avatar: string | null
}

function mapMessage(m: RawMessage, meId: string, profiles: Map<string, Profile>) {
  const sender = profiles.get(m.sender_id)
  return {
    id:           m.id,
    senderId:     m.sender_id,
    senderName:   sender?.name ?? 'Unknown',
    senderAvatar: sender?.avatar ?? '',
    content:      m.content,
    timestamp:    new Date(m.created_at).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    }),
    isMe: m.sender_id === meId,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('team-chat/GET 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's profile to find team_id and member count
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!profile.team_id) {
    return NextResponse.json({ teamId: null, messages: [] })
  }

  const teamId = profile.team_id

  // Get member count
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)

  // Fetch last 50 messages ordered ascending
  const { data: messages, error: messagesError } = await supabase
    .from('team_messages')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (messagesError) {
    logError('team-chat/GET', messagesError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const msgs: RawMessage[] = (messages ?? []).reverse()

  // Collect unique sender ids
  const senderIds = Array.from(new Set(msgs.map((m) => m.sender_id)))

  // Fetch profiles for all senders
  const profileMap = new Map<string, Profile>()
  if (senderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar')
      .in('id', senderIds)

    for (const p of profiles ?? []) {
      profileMap.set(p.id, p)
    }
  }

  // Also fetch team name
  const { data: teamData } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single()

  return NextResponse.json({
    teamId,
    teamName: teamData?.name ?? 'Team',
    memberCount: memberCount ?? 0,
    messages: msgs.map((m) => mapMessage(m, user.id, profileMap)),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    logInfo('team-chat/POST 401', 'Unauthorized: no session')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await rateLimit(`team-chat:${user.id}`, 30, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many messages — slow down' }, { status: 429 })
  }

  const raw = await request.json()
  const result = postSchema.safeParse(raw)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 })
  }

  const { content } = result.data

  // Get user's team_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('team_id, name, avatar')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!profile.team_id) {
    return NextResponse.json({ error: 'Not in a team' }, { status: 400 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from('team_messages')
    .insert({ team_id: profile.team_id, sender_id: user.id, content })
    .select()
    .single()

  if (insertError) {
    logError('team-chat/POST', insertError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const profileMap = new Map<string, Profile>()
  profileMap.set(user.id, { id: user.id, name: profile.name, avatar: profile.avatar })

  return NextResponse.json(mapMessage(inserted as RawMessage, user.id, profileMap))
}
