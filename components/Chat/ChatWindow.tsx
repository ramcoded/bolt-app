'use client'

import { useState } from 'react'
import { X, Minus, Send } from 'lucide-react'
import { TeamMember, ChatMessage } from '@/lib/mock-data'

interface ChatWindowProps {
  member: TeamMember
  messages: ChatMessage[]
  minimized: boolean
  onClose: () => void
  onMinimize: () => void
  onSend: (content: string) => void
}

export default function ChatWindow({ member, messages, minimized, onClose, onMinimize, onSend }: ChatWindowProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  return (
    <div className="chat-window animate-slide-up">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
        onClick={onMinimize}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(79,70,229,0.45)' }}>
              {member.avatar}
            </div>
            {member.online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2"
                style={{ borderColor: '#0a0a0f' }} />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-none">{member.name}</p>
            <p className="text-[10px] text-white/35 mt-0.5">{member.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
            {messages.length === 0 && (
              <p className="text-xs text-white/25 text-center mt-8">
                Start a conversation with {member.name.split(' ')[0]}
              </p>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === 'me'
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                    style={
                      isMe
                        ? { background: 'var(--bolt-accent)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }
                    }>
                    <p>{msg.content}</p>
                    <p className="text-[10px] opacity-45 mt-0.5 text-right">{msg.timestamp}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-2 flex items-center gap-2 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 text-xs text-white placeholder-white/25 outline-none px-3 py-1.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
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
