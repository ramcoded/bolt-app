'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Minus, Send, Bell, BellOff, Check, CheckCheck } from 'lucide-react'
import { TeamMember, ChatMessage } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'
import { createClient } from '@/lib/supabase/client'

interface ChatWindowProps {
  member: TeamMember
  messages: ChatMessage[]
  minimized: boolean
  myId?: string
  muted?: boolean
  onClose: () => void
  onMinimize: () => void
  onSend: (content: string) => void
  onMute?: (muted: boolean) => void
}

export default function ChatWindow({ member, messages, minimized, myId, muted, onClose, onMinimize, onSend, onMute }: ChatWindowProps) {
  const [input,      setInput]      = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [readByPeer, setReadByPeer] = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const channelRef  = useRef<any>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, peerTyping])

  // Typing + read-receipt channel
  useEffect(() => {
    if (!myId || !member.id) return
    const supabase = createClient()
    const key      = [myId, member.id].sort().join('-')
    const channel  = supabase
      .channel(`typing-${key}`)
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        if (payload.userId === myId) return
        setPeerTyping(true)
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setPeerTyping(false), 3000)
      })
      .on('broadcast', { event: 'read' }, ({ payload }: any) => {
        if (payload.userId === myId) return
        setReadByPeer(true)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
      supabase.removeChannel(channel)
    }
  }, [myId, member.id])

  // Broadcast "read" when this window is open and has messages from peer
  useEffect(() => {
    if (minimized || !myId || !channelRef.current) return
    channelRef.current.send({ type: 'broadcast', event: 'read', payload: { userId: myId } })
  }, [messages, minimized, myId])

  const broadcastTyping = () => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } })
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setReadByPeer(false)
    onSend(text)
    setInput('')
  }

  const safeMessages = Array.isArray(messages) ? messages : []
  const myMessages = safeMessages.filter((m) => m.senderId === 'me' || m.senderId === myId)
  const lastMyMsgId = myMessages[myMessages.length - 1]?.id

  return (
    <div className="chat-window animate-slide-up">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)' }}
        onClick={onMinimize}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
              style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(79,70,229,0.45)' }}>
              <AvatarImage src={member.avatar} alt={member.name} />
            </div>
            {member.online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2"
                style={{ borderColor: '#0a0a0f' }} />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-none">{member.name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: peerTyping ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
              {peerTyping ? 'typing…' : member.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onMute && (
            <button
              onClick={(e) => { e.stopPropagation(); onMute(!muted) }}
              title={muted ? 'Unmute notifications' : 'Mute notifications'}
              className="p-1 rounded hover:bg-white/8 transition-colors"
              style={{ color: muted ? '#f87171' : 'rgba(255,255,255,0.35)' }}
            >
              {muted ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onMinimize() }}
            className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {safeMessages.length === 0 && (
              <p className="text-xs text-white/25 text-center mt-8">
                Start a conversation with {member.name.split(' ')[0]}
              </p>
            )}
            {safeMessages.map((msg) => {
              const isMe       = msg.senderId === 'me' || msg.senderId === myId
              const isLastMine = isMe && msg.id === lastMyMsgId
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={isMe
                      ? { background: 'var(--bolt-accent)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)' }}>
                    <p>{msg.content}</p>
                    <p className="text-[10px] opacity-45 mt-0.5 text-right">{msg.timestamp}</p>
                  </div>
                  {isLastMine && (
                    <div className="flex items-center gap-0.5 mt-0.5 pr-1">
                      {msg.sending ? (
                        <span className="text-[9px] text-white/30">Sending…</span>
                      ) : readByPeer ? (
                        <>
                          <CheckCheck className="w-2.5 h-2.5 text-indigo-400" />
                          <span className="text-[9px] text-indigo-400">Read</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-2.5 h-2.5 text-white/30" />
                          <span className="text-[9px] text-white/30">Sent</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

          <div className="p-2 flex items-center gap-2 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              value={input}
              onChange={(e) => { setInput(e.target.value); broadcastTyping() }}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 text-xs text-white placeholder-white/25 outline-none px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
            <button onClick={handleSend}
              className="p-1.5 rounded-xl text-white transition-colors"
              style={{ background: 'var(--bolt-accent)' }}>
              <Send className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
