'use client'

import { useState, useEffect, useRef } from 'react'
import { Users, X, Minus, Send, Loader2, Check } from 'lucide-react'
import AvatarImage from '@/components/AvatarImage'

export type GroupMessage = {
  id: string
  senderId: string
  senderName: string
  senderAvatar: string
  content: string
  timestamp: string
  isMe: boolean
  sending?: boolean
}

interface GroupChatWindowProps {
  teamId: string
  teamName: string
  memberCount: number
  messages: GroupMessage[]
  minimized: boolean
  myId: string
  isSending?: boolean
  embedded?: boolean
  onClose?: () => void
  onMinimize?: () => void
  onSend: (content: string) => void
}

export default function GroupChatWindow({
  teamId,
  teamName,
  memberCount,
  messages,
  minimized,
  myId,
  isSending = false,
  embedded = false,
  onClose,
  onMinimize,
  onSend,
}: GroupChatWindowProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isSending) return
    onSend(text)
    setInput('')
  }

  const safeMessages = Array.isArray(messages) ? messages : []

  // Determine if this message starts a new run (different sender from previous)
  const isNewRun = (index: number) => {
    if (index === 0) return true
    return safeMessages[index].senderId !== safeMessages[index - 1].senderId
  }

  if (embedded) {
    return (
      <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto pl-4 pr-3 py-3 space-y-1"
          style={{
            minHeight: 0,
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.1) transparent',
          }}
        >
          {safeMessages.length === 0 && (
            <p className="text-xs text-white/25 text-center mt-8">
              No messages yet. Start the conversation!
            </p>
          )}
          {(() => {
            const myMsgs = safeMessages.filter((m) => m.isMe)
            const lastMyMsgId = myMsgs[myMsgs.length - 1]?.id
            return safeMessages.map((msg, i) => {
              const showMeta = !msg.isMe && isNewRun(i)
              const isLastMine = msg.isMe && msg.id === lastMyMsgId
              return (
                <div key={msg.id} className={`flex flex-col w-full ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  {showMeta && (
                    <div className="flex items-center gap-1.5 mb-0.5 ml-8">
                      <span className="text-[10px] text-white/50">{msg.senderName}</span>
                    </div>
                  )}
                  <div className={`flex items-end gap-1.5 max-w-[82%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!msg.isMe && (
                      <div className="flex-shrink-0 mb-1">
                        {isNewRun(i) ? (
                          <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
                            style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(79,70,229,0.45)' }}>
                            <AvatarImage src={msg.senderAvatar} alt={msg.senderName} />
                          </div>
                        ) : (
                          <div className="w-6 h-6" />
                        )}
                      </div>
                    )}
                    <div
                      className={`flex-1 min-w-0 px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${msg.isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                      style={msg.isMe
                        ? { background: 'var(--bolt-accent)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)' }}
                    >
                      <p>{msg.content}</p>
                      <p className="text-[10px] opacity-45 mt-0.5 text-right">{msg.timestamp}</p>
                    </div>
                  </div>
                  {isLastMine && (
                    <div className="flex items-center gap-0.5 mt-0.5 pr-1">
                      {msg.sending ? (
                        <span className="text-[9px] text-white/30">Sending…</span>
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
            })
          })()}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message the team..."
            disabled={isSending}
            className="flex-1 text-xs text-white placeholder-white/25 outline-none px-3 py-1.5 rounded-xl disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          />
          <button
            onClick={handleSend}
            disabled={isSending}
            className="p-1.5 rounded-xl text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'var(--bolt-accent)' }}
          >
            {isSending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <Send className="w-3 h-3" />
            }
          </button>
        </div>
      </div>
    )
  }

  // Floating window
  return (
    <div
      className="chat-window animate-slide-up"
      style={{ width: '300px', height: minimized ? 'auto' : '480px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(99,102,241,0.08)' }}
        onClick={onMinimize}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(139,92,246,0.3) 100%)',
              border: '1px solid rgba(99,102,241,0.5)',
            }}
          >
            <Users className="w-3.5 h-3.5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-white leading-none">{teamName}</p>
              <span
                className="text-[9px] px-1 py-0.5 rounded font-bold tracking-wide"
                style={{ background: 'rgba(99,102,241,0.35)', color: '#a5b4fc' }}
              >
                GROUP
              </span>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(165,180,252,0.7)' }}>
              {memberCount} members · Group Chat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize?.() }}
            className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose?.() }}
            className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Messages + Input */}
      {!minimized && (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {safeMessages.length === 0 && (
              <p className="text-xs text-white/25 text-center mt-8">
                No messages yet. Start the conversation!
              </p>
            )}
            {(() => {
              const myMsgs = safeMessages.filter((m) => m.isMe)
              const lastMyMsgId = myMsgs[myMsgs.length - 1]?.id
              return safeMessages.map((msg, i) => {
                const showMeta = !msg.isMe && isNewRun(i)
                const isLastMine = msg.isMe && msg.id === lastMyMsgId
                return (
                  <div key={msg.id} className={`flex flex-col w-full ${msg.isMe ? 'items-end' : 'items-start'}`}>
                    {showMeta && (
                      <div className="flex items-center gap-1.5 mb-0.5 ml-8">
                        <span className="text-[10px] text-white/50">{msg.senderName}</span>
                      </div>
                    )}
                    <div className={`flex items-end gap-1.5 max-w-[82%] ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!msg.isMe && (
                        <div className="flex-shrink-0 mb-1">
                          {isNewRun(i) ? (
                            <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
                              style={{ background: 'rgba(79,70,229,0.3)', border: '1px solid rgba(79,70,229,0.45)' }}>
                              <AvatarImage src={msg.senderAvatar} alt={msg.senderName} />
                            </div>
                          ) : (
                            <div className="w-6 h-6" />
                          )}
                        </div>
                      )}
                      <div
                        className={`flex-1 min-w-0 px-3 py-1.5 rounded-2xl text-xs leading-relaxed ${msg.isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                        style={msg.isMe
                          ? { background: 'var(--bolt-accent)', color: '#fff' }
                          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)' }}
                      >
                        <p>{msg.content}</p>
                        <p className="text-[10px] opacity-45 mt-0.5 text-right">{msg.timestamp}</p>
                      </div>
                    </div>
                    {isLastMine && (
                      <div className="flex items-center gap-0.5 mt-0.5 pr-1">
                        {msg.sending ? (
                          <span className="text-[9px] text-white/30">Sending…</span>
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
              })
            })()}
            <div ref={bottomRef} />
          </div>

          <div className="p-2 flex items-center gap-2 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message the team..."
              disabled={isSending}
              className="flex-1 text-xs text-white placeholder-white/25 outline-none px-3 py-1.5 rounded-xl disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
            <button
              onClick={handleSend}
              disabled={isSending}
              className="p-1.5 rounded-xl text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--bolt-accent)' }}
            >
              {isSending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Send className="w-3 h-3" />
              }
            </button>
          </div>
        </>
      )}
    </div>
  )
}
