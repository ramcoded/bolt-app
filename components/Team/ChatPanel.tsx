'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, ArrowLeft, Check, CheckCheck } from 'lucide-react'
import type { TeamMember, ChatMessage } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/Toast'

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

interface ChatPanelProps {
  member: TeamMember
  onClose: () => void
}

export default function ChatPanel({ member, onClose }: ChatPanelProps) {
  const [messages,   setMessages]   = useState<ChatMessage[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(true)
  const [peerTyping, setPeerTyping] = useState(false)
  const [readByPeer, setReadByPeer] = useState(false)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const channelRef    = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const typingChannel = useRef<any>(null)
  const typingTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenMsgIds    = useRef<Set<string>>(new Set())
  const { profile }  = useAuth()
  const { addToast } = useToast()

  useEffect(() => {
    fetch(`/api/messages?with=${member.id}`)
      .then((r) => r.json())
      .then((msgs) => { setMessages(msgs); setLoading(false) })
  }, [member.id])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Typing indicator channel
  useEffect(() => {
    if (!profile?.id || !member.id) return
    const supabase = createClient()
    const key      = [profile.id, member.id].sort().join('-')
    const channel  = supabase
      .channel(`typing-${key}`)
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (payload.userId === profile.id) return
        setPeerTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setPeerTyping(false), 3000)
      })
      .on('broadcast', { event: 'read' }, ({ payload }: any) => {
        if (payload.userId === profile.id) return
        setReadByPeer(true)
      })
      .subscribe()
    typingChannel.current = channel
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      supabase.removeChannel(channel)
    }
  }, [profile?.id, member.id])

  const broadcastTyping = () => {
    typingChannel.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: profile?.id } })
  }

  // Broadcast "read" whenever messages change (panel is always open/visible)
  useEffect(() => {
    if (!profile?.id || !typingChannel.current) return
    typingChannel.current.send({ type: 'broadcast', event: 'read', payload: { userId: profile.id } })
  }, [messages, profile?.id])

  // Realtime subscription for incoming messages (postgres_changes + broadcast fallback)
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()

    const toMsg = (raw: any): ChatMessage => ({
      id:        raw.id,
      senderId:  raw.sender_id,
      content:   raw.content,
      timestamp: new Date(raw.created_at).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: false,
      }),
      read: false,
    })

    const handleIncoming = (msg: ChatMessage, content: string) => {
      if (seenMsgIds.current.has(msg.id)) return
      seenMsgIds.current.add(msg.id)
      playNotifSound()
      addToast(member.name, content, 'message')
      setMessages((prev) => [...prev, msg])
    }

    const channel = supabase
      .channel(`inbox-${profile.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${profile.id}` },
        (payload: any) => {
          if (payload.new.sender_id !== member.id) return
          handleIncoming(toMsg(payload.new), payload.new.content)
        }
      )
      .on('broadcast', { event: 'new_message' }, ({ payload }: any) => {
        if (payload.sender_id !== member.id || payload.receiver_id !== profile.id) return
        const msg = toMsg({ ...payload, created_at: payload.created_at ?? new Date().toISOString() })
        handleIncoming(msg, payload.content)
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id, member.id])

  const send = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setReadByPeer(false)
    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id:        tempId,
      senderId:  profile?.id ?? 'me',
      content:   text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      read:      false,
      sending:   true,
    }
    setMessages((prev) => [...prev, optimistic])
    const res = await fetch('/api/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ receiver_id: member.id, content: text }),
    })
    const msg: ChatMessage = await res.json()
    setMessages((prev) => prev.map((m) => m.id === tempId ? msg : m))

    // Broadcast to receiver's inbox channel so their ChatTabs fires sound + toast
    if (profile?.id && member.id !== profile.id) {
      const supabase = createClient()
      const ch = supabase.channel(`inbox-${member.id}`)
      ch.httpSend('new_message', {
        id:          (msg as any).id,
        sender_id:   profile.id,
        receiver_id: member.id,
        content:     text,
        created_at:  new Date().toISOString(),
      })
    }
  }

  return (
    <div className="glass-card flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button onClick={onClose}
          className="p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-colors md:hidden">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white overflow-hidden"
            style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(79,70,229,0.45)' }}>
            <AvatarImage src={member.avatar} alt={member.name} />
          </div>
          {member.online && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2"
              style={{ borderColor: '#0a0a0f' }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{member.name}</p>
          <p className="text-xs" style={{ color: peerTyping ? '#4ade80' : member.online ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
            {peerTyping ? 'typing…' : member.online ? 'Online' : `Last seen ${member.lastSeen ?? 'a while ago'}`}
          </p>
        </div>
        <button onClick={onClose}
          className="hidden md:flex p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <p className="text-xs text-white/25 text-center mt-8">Loading…</p>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.25)' }}>
              <span className="text-2xl font-bold text-white/40"><AvatarImage src={member.avatar} alt={member.name} /></span>
            </div>
            <p className="text-sm text-white/35">Start a conversation with</p>
            <p className="text-sm font-semibold text-white">{member.name}</p>
          </div>
        )}
        {(() => {
          const myMsgs = messages.filter((m) => m.senderId === 'me' || m.senderId === profile?.id)
          const lastMyMsgId = myMsgs[myMsgs.length - 1]?.id
          return messages.map((msg) => {
            const isMe       = msg.senderId === 'me' || msg.senderId === profile?.id
            const isLastMine = isMe && msg.id === lastMyMsgId
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2 w-full`}>
                  {!isMe && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-auto overflow-hidden"
                      style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}>
                      <AvatarImage src={member.avatar} alt={member.name} />
                    </div>
                  )}
                  <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={
                      isMe
                        ? { background: 'var(--bolt-accent)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.88)' }
                    }>
                    <p>{msg.content}</p>
                    <p className="text-[11px] opacity-40 mt-1 text-right">{msg.timestamp}</p>
                  </div>
                </div>
                {isLastMine && (
                  <div className="flex items-center gap-0.5 mt-0.5 pr-1">
                    {msg.sending ? (
                      <span className="text-[10px] text-white/30">Sending…</span>
                    ) : readByPeer ? (
                      <>
                        <CheckCheck className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] text-indigo-400">Read</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3 text-white/30" />
                        <span className="text-[10px] text-white/30">Sent</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })
        })()}
        {peerTyping && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl rounded-bl-sm flex items-center gap-1"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); broadcastTyping() }}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Message ${member.name.split(' ')[0]}...`}
            className="flex-1 text-sm text-white placeholder-white/25 outline-none px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          />
          <button onClick={send}
            className="w-10 h-10 rounded-2xl text-white flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ background: 'var(--bolt-accent)' }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
