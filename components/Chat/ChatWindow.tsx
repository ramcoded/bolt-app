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

export default function ChatWindow({
  member,
  messages,
  minimized,
  onClose,
  onMinimize,
  onSend,
}: ChatWindowProps) {
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
        className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 cursor-pointer"
        onClick={onMinimize}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-bolt-maroon/40 border border-bolt-maroon/50 flex items-center justify-center text-xs font-bold text-white">
              {member.avatar}
            </div>
            {member.online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-bolt-bg" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-none">{member.name}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{member.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize() }}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-white/30 text-center mt-8">
                Start a conversation with {member.name.split(' ')[0]}
              </p>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === 'me'
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-bolt-maroon text-white rounded-br-sm'
                        : 'bg-white/10 text-white/90 rounded-bl-sm'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-[10px] opacity-50 mt-0.5 text-right">{msg.timestamp}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-2 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-bolt-maroon/50 transition-colors"
            />
            <button
              onClick={handleSend}
              className="p-1.5 rounded-xl bg-bolt-maroon hover:bg-bolt-maroon-light text-white transition-colors"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
