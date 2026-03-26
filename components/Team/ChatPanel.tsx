'use client'

import { useState } from 'react'
import { X, Send, ArrowLeft } from 'lucide-react'
import { TeamMember, ChatMessage, mockConversations } from '@/lib/mock-data'

interface ChatPanelProps {
  member: TeamMember
  onClose: () => void
}

export default function ChatPanel({ member, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockConversations[member.id] ?? [])
  const [input,    setInput]    = useState('')

  const send = () => {
    const text = input.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: 'me',
        content: text,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        read: true,
      },
    ])
    setInput('')
  }

  return (
    <div className="glass-card flex flex-col h-full animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onClose}
          className="p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-colors md:hidden">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
            style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(79,70,229,0.45)' }}>
            {member.avatar}
          </div>
          {member.online && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2"
              style={{ borderColor: '#0a0a0f' }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">{member.name}</p>
          <p className="text-xs" style={{ color: member.online ? '#4ade80' : 'rgba(255,255,255,0.35)' }}>
            {member.online ? 'Online' : `Last seen ${member.lastSeen}`}
          </p>
        </div>
        <button onClick={onClose}
          className="hidden md:flex p-1.5 rounded-xl text-white/35 hover:text-white hover:bg-white/8 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.25)' }}>
              <span className="text-2xl font-bold text-white/40">{member.avatar}</span>
            </div>
            <p className="text-sm text-white/35">Start a conversation with</p>
            <p className="text-sm font-semibold text-white">{member.name}</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === 'me'
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-auto"
                  style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}>
                  {member.avatar}
                </div>
              )}
              <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                style={
                  isMe
                    ? { background: 'var(--bolt-accent)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.88)' }
                }>
                <p>{msg.content}</p>
                <p className="text-[11px] opacity-40 mt-1 text-right">{msg.timestamp}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={`Message ${member.name.split(' ')[0]}...`}
            className="flex-1 text-sm text-white placeholder-white/25 outline-none px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
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
