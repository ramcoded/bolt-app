'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'
import type { TeamMember, ChatMessage } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'
import ChatWindow from './ChatWindow'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useOnlineIds } from '@/lib/presence-context'

type OpenChat = { member: TeamMember; minimized: boolean; messages: ChatMessage[] }

function playNotifSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx  = new AudioCtx()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880,  ctx.currentTime)
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.35)
  } catch { /* audio blocked */ }
}

export default function ChatTabs() {
  const [openChats,  setOpenChats]  = useState<OpenChat[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [members,    setMembers]    = useState<TeamMember[]>([])
  const [mutedIds,   setMutedIds]   = useState<Set<string>>(new Set())
  const membersRef   = useRef<TeamMember[]>([])
  const openChatsRef = useRef<OpenChat[]>([])
  const mutedIdsRef  = useRef<Set<string>>(new Set())
  const channelRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const { profile }  = useAuth()
  const onlineIds    = useOnlineIds()

  // Keep refs in sync for use inside realtime closures
  useEffect(() => { openChatsRef.current = openChats }, [openChats])
  useEffect(() => { mutedIdsRef.current  = mutedIds  }, [mutedIds])

  // Load muted IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('chat-muted')
      if (saved) setMutedIds(new Set(JSON.parse(saved)))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => { setMembers(data); membersRef.current = data })
  }, [])

  const membersWithPresence = members.map((m) => ({ ...m, online: onlineIds.has(m.id) }))

  // Shared handler for incoming messages (called from both postgres_changes and broadcast).
  // Dual-path delivery ensures messages arrive even when Supabase REPLICA IDENTITY
  // is not configured — postgres_changes is the primary path, broadcast is the fallback.
  // Deduplication by message ID prevents doubles when both paths fire simultaneously.
  const handleIncoming = (raw: {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    created_at: string
  }, myId: string) => {
    if (raw.receiver_id !== myId) return
    const sender = membersRef.current.find((m) => m.id === raw.sender_id)
    if (!sender) return

    const isMuted = mutedIdsRef.current.has(sender.id)

    const msg: ChatMessage = {
      id:        raw.id,
      senderId:  raw.sender_id,
      content:   raw.content,
      timestamp: new Date(raw.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
      read: false,
    }

    if (!isMuted) playNotifSound()

    const existing = openChatsRef.current.find((c) => c.member.id === sender.id)

    if (!existing) {
      fetch(`/api/messages?with=${sender.id}`)
        .then((r) => r.json())
        .then((msgs: ChatMessage[]) => {
          setOpenChats((p) => {
            if (p.find((c) => c.member.id === sender.id)) {
              // Window opened in the meantime — dedup + append if needed
              return p.map((c) => c.member.id === sender.id
                ? {
                    ...c,
                    minimized: isMuted ? c.minimized : false,
                    messages: c.messages.find((m) => m.id === msg.id)
                      ? c.messages
                      : [...c.messages, msg],
                  }
                : c
              )
            }
            return [...p, { member: sender, minimized: isMuted, messages: msgs }]
          })
        })
    } else {
      setOpenChats((p) => p.map((c) => c.member.id === sender.id
        ? {
            ...c,
            minimized: isMuted ? c.minimized : false,
            messages: c.messages.find((m) => m.id === msg.id)
              ? c.messages
              : [...c.messages, msg],
          }
        : c
      ))
    }
  }

  // Realtime: subscribe to inbox channel for both postgres_changes AND broadcast
  useEffect(() => {
    if (!profile?.id) return
    const myId    = profile.id
    const supabase = createClient()

    const channel = supabase
      .channel(`inbox-${myId}`)
      // Primary: postgres_changes (requires Supabase realtime enabled on messages table)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          handleIncoming({
            id:          payload.new.id,
            sender_id:   payload.new.sender_id,
            receiver_id: payload.new.receiver_id,
            content:     payload.new.content,
            created_at:  payload.new.created_at,
          }, myId)
        }
      )
      // Fallback: broadcast pushed by the sender after their API call succeeds.
      // Works regardless of postgres_changes / replication configuration.
      .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
        handleIncoming({
          id:          payload.id,
          sender_id:   payload.sender_id,
          receiver_id: payload.receiver_id,
          content:     payload.content,
          created_at:  payload.created_at,
        }, myId)
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const openChat = async (member: TeamMember) => {
    const already = openChats.find((c) => c.member.id === member.id)
    if (already) {
      setOpenChats((prev) => prev.map((c) => c.member.id === member.id ? { ...c, minimized: false } : c))
    } else {
      const res  = await fetch(`/api/messages?with=${member.id}`)
      const msgs: ChatMessage[] = await res.json()
      setOpenChats((prev) => [...prev, { member, minimized: false, messages: msgs }])
    }
    setPickerOpen(false)
  }

  const closeChat  = (id: string) => setOpenChats((prev) => prev.filter((c) => c.member.id !== id))
  const toggleMin  = (id: string) => setOpenChats((prev) => prev.map((c) => c.member.id === id ? { ...c, minimized: !c.minimized } : c))
  const toggleMute = (id: string, mute: boolean) => {
    setMutedIds((prev) => {
      const next = new Set(prev)
      mute ? next.add(id) : next.delete(id)
      try { localStorage.setItem('chat-muted', JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
  }

  const sendMessage = async (memberId: string, content: string) => {
    const res = await fetch('/api/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ receiver_id: memberId, content }),
    })
    const msg: ChatMessage = await res.json()

    // Update sender's own window immediately
    setOpenChats((prev) => prev.map((c) => c.member.id === memberId
      ? { ...c, messages: [...c.messages, msg] }
      : c
    ))

    // Broadcast to receiver's inbox channel for guaranteed real-time delivery.
    // Subscribes briefly, sends, then cleans up.
    if (profile?.id) {
      const supabase = createClient()
      const ch = supabase.channel(`inbox-${memberId}`)
      ch.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          ch.send({
            type:    'broadcast',
            event:   'new_message',
            payload: {
              id:          msg.id,
              sender_id:   profile.id,
              receiver_id: memberId,
              content:     msg.content,
              created_at:  new Date().toISOString(),
            },
          }).finally(() => { supabase.removeChannel(ch) })
        }
      })
    }
  }

  const minimizedChats = openChats.filter((c) => c.minimized)
  const activeChats    = openChats.filter((c) => !c.minimized)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">

      {/* Active (non-minimized) chat windows */}
      {activeChats.map((chat) => (
        <ChatWindow
          key={chat.member.id}
          member={chat.member}
          messages={chat.messages}
          minimized={false}
          myId={profile?.id}
          muted={mutedIds.has(chat.member.id)}
          onClose={() => closeChat(chat.member.id)}
          onMinimize={() => toggleMin(chat.member.id)}
          onSend={(content) => sendMessage(chat.member.id, content)}
          onMute={(m) => toggleMute(chat.member.id, m)}
        />
      ))}

      {/* FAB + minimized avatars + picker */}
      <div className="relative flex-shrink-0">

        {/* Minimized chat avatars stacked above FAB */}
        {minimizedChats.length > 0 && (
          <div className="absolute bottom-14 right-0 flex flex-col-reverse gap-2 items-center pb-1">
            {minimizedChats.map((chat) => (
              <button
                key={chat.member.id}
                onClick={() => toggleMin(chat.member.id)}
                title={chat.member.name}
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-200 hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.9) 0%, rgba(99,102,241,0.8) 100%)',
                  border:     '2px solid rgba(99,102,241,0.7)',
                  boxShadow:  '0 4px 14px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.2)',
                }}
              >
                <AvatarImage src={chat.member.avatar} alt={chat.member.name} />
              </button>
            ))}
          </div>
        )}

        {/* Team picker */}
        {pickerOpen && (
          <div className="glass-dropdown w-64 animate-slide-up absolute bottom-16 right-0">
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-semibold text-white">Team</p>
              <button onClick={() => setPickerOpen(false)} className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
              {membersWithPresence.map((member) => (
                <button key={member.id} onClick={() => openChat(member)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/7 transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}>
                      <AvatarImage src={member.avatar} alt={member.name} />
                    </div>
                    {member.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2"
                        style={{ borderColor: '#0a0a0f' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{member.name}</p>
                    <p className="text-[10px] text-white/35 truncate">{member.role}</p>
                  </div>
                  {member.online
                    ? <span className="text-[10px] text-green-400 font-medium">Online</span>
                    : <span className="text-[10px] text-white/25">{member.lastSeen}</span>
                  }
                </button>
              ))}
              {members.length === 0 && (
                <p className="text-xs text-white/25 text-center py-4">Loading…</p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="rounded-full flex items-center justify-center transition-all duration-200 group relative"
          style={{
            width:          '52px',
            height:         '52px',
            background:     pickerOpen
              ? 'var(--bolt-accent)'
              : 'linear-gradient(135deg, rgba(79,70,229,0.85) 0%, rgba(99,102,241,0.75) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow:      '0 4px 20px rgba(79,70,229,0.45)',
            border:         '1px solid rgba(99,102,241,0.5)',
          }}
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform text-white" />
          {openChats.length > 0 && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
              style={{ background: '#ef4444', border: '2px solid #0a0a0f' }}
            >
              {openChats.length}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
