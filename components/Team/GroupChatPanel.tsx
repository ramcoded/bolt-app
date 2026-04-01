'use client'

import { useState, useEffect, useRef } from 'react'
import { Users } from 'lucide-react'
import GroupChatWindow, { type GroupMessage } from '@/components/Chat/GroupChatWindow'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

export default function GroupChatPanel() {
  const { profile } = useAuth()
  const [messages,    setMessages]    = useState<GroupMessage[]>([])
  const [teamId,      setTeamId]      = useState<string | null>(null)
  const [teamName,    setTeamName]    = useState('Team')
  const [memberCount, setMemberCount] = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [noTeam,      setNoTeam]      = useState(false)
  const [isSending,   setIsSending]   = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    fetch('/api/team-chat')
      .then((r) => r.json())
      .then((data) => {
        if (!data.teamId) {
          setNoTeam(true)
          return
        }
        setTeamId(data.teamId)
        setTeamName(data.teamName ?? 'Team')
        setMemberCount(data.memberCount ?? 0)
        setMessages(data.messages ?? [])
      })
      .catch(() => setNoTeam(true))
      .finally(() => setLoading(false))
  }, [])

  // Subscribe to realtime group messages
  useEffect(() => {
    if (!teamId || !profile?.id) return
    const supabase = createClient()
    const myId = profile.id

    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        async (payload: any) => {
          if (payload.new.sender_id === myId) return
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('name, avatar')
            .eq('id', payload.new.sender_id)
            .single()
          const msg: GroupMessage = {
            id:           payload.new.id,
            senderId:     payload.new.sender_id,
            senderName:   senderProfile?.name ?? 'Unknown',
            senderAvatar: senderProfile?.avatar ?? '',
            content:      payload.new.content,
            timestamp:    new Date(payload.new.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            }),
            isMe: false,
          }
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      )
      .on('broadcast', { event: 'group_message' }, ({ payload }: any) => {
        if (payload.senderId === myId) return
        setMessages((prev) => {
          if (prev.find((m) => m.id === payload.id)) return prev
          return [...prev, { ...payload, isMe: false }]
        })
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [teamId, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (content: string) => {
    if (!teamId || !profile || isSending) return
    setIsSending(true)

    try {
      const res = await fetch('/api/team-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content }),
      })

      if (!res.ok) return

      const msg: GroupMessage = await res.json()

      // Append own message immediately
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })

      // Broadcast to other team members
      const supabase = createClient()
      const ch = supabase.channel(`team-chat-${teamId}`)
      ch.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          ch.send({
            type:    'broadcast',
            event:   'group_message',
            payload: {
              id:           msg.id,
              senderId:     profile.id,
              senderName:   profile.name,
              senderAvatar: profile.avatar ?? '',
              content:      msg.content,
              timestamp:    msg.timestamp,
              isMe:         false,
            },
          }).finally(() => { supabase.removeChannel(ch) })
        }
      })
    } finally {
      setIsSending(false)
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border:     '1px solid rgba(255,255,255,0.08)',
          height:     '560px',
        }}
      >
        <div className="flex items-center justify-center flex-1">
          <p className="text-xs text-white/30">Loading team chat…</p>
        </div>
      </div>
    )
  }

  if (noTeam || !teamId) {
    return (
      <div
        className="rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border:     '1px solid rgba(255,255,255,0.08)',
          height:     '560px',
        }}
      >
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-white/60">You&apos;re not in a team yet</p>
          <p className="text-xs text-white/30">Join a team to access the group chat.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border:     '1px solid rgba(255,255,255,0.08)',
        height:     '560px',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background:   'rgba(99,102,241,0.06)',
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.3) 100%)',
            border:     '1px solid rgba(99,102,241,0.5)',
          }}
        >
          <Users className="w-4 h-4 text-indigo-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">{teamName}</p>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wide flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.35)', color: '#a5b4fc' }}
            >
              GROUP
            </span>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(165,180,252,0.65)' }}>
            {memberCount} members · Group Chat
          </p>
        </div>
      </div>

      {/* Chat window embedded */}
      <GroupChatWindow
        teamId={teamId}
        teamName={teamName}
        memberCount={memberCount}
        messages={messages}
        minimized={false}
        myId={profile?.id ?? ''}
        isSending={isSending}
        embedded={true}
        onSend={handleSend}
      />
    </div>
  )
}
