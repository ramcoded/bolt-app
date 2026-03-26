'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X } from 'lucide-react'
import type { TeamMember, ChatMessage } from '@/lib/mock-data'
import ChatWindow from './ChatWindow'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'

type OpenChat = { member: TeamMember; minimized: boolean; messages: ChatMessage[] }
type Toast    = { member: TeamMember; content: string }

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
  const [toast,      setToast]      = useState<Toast | null>(null)
  const membersRef  = useRef<TeamMember[]>([])
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef  = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => { setMembers(data); membersRef.current = data })
  }, [])

  // Realtime: incoming messages
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()
    const channel  = supabase
      .channel(`inbox-${profile.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${profile.id}` },
        (payload: any) => {
          const msg: ChatMessage = {
            id:        payload.new.id,
            senderId:  payload.new.sender_id,
            content:   payload.new.content,
            timestamp: new Date(payload.new.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false,
            }),
            read: false,
          }

          setOpenChats((prev) => {
            const senderChat = prev.find((c) => c.member.id === msg.senderId)
            // Play sound + show toast if no open (non-minimized) window for sender
            if (!senderChat || senderChat.minimized) {
              const sender = membersRef.current.find((m) => m.id === msg.senderId)
              if (sender) {
                playNotifSound()
                setToast({ member: sender, content: msg.content })
                if (toastTimer.current) clearTimeout(toastTimer.current)
                toastTimer.current = setTimeout(() => setToast(null), 4500)
              }
            }
            return prev.map((c) =>
              c.member.id === msg.senderId ? { ...c, messages: [...c.messages, msg] } : c
            )
          })
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [profile?.id])

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

  const closeChat   = (id: string) => setOpenChats((prev) => prev.filter((c) => c.member.id !== id))
  const toggleMin   = (id: string) => setOpenChats((prev) => prev.map((c) => c.member.id === id ? { ...c, minimized: !c.minimized } : c))

  const sendMessage = async (memberId: string, content: string) => {
    const res = await fetch('/api/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ receiver_id: memberId, content }),
    })
    const msg: ChatMessage = await res.json()
    setOpenChats((prev) => prev.map((c) => c.member.id === memberId ? { ...c, messages: [...c.messages, msg] } : c))
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">

      {/* Floating message toast */}
      {toast && (
        <div
          className="fixed bottom-24 right-6 z-50 flex items-start gap-3 p-3 rounded-2xl animate-slide-up cursor-pointer"
          style={{
            background:    'rgba(10,10,20,0.96)',
            border:        '1px solid rgba(99,102,241,0.4)',
            boxShadow:     '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.1)',
            backdropFilter:'blur(24px)',
            maxWidth:      '280px',
          }}
          onClick={() => {
            const m = membersRef.current.find((m) => m.id === toast.member.id)
            if (m) openChat(m)
            setToast(null)
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 text-sm"
            style={{ background: 'rgba(79,70,229,0.35)', border: '1px solid rgba(99,102,241,0.45)' }}
          >
            {toast.member.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white leading-none">{toast.member.name}</p>
            <p className="text-xs text-white/55 mt-1 line-clamp-2 leading-relaxed">{toast.content}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setToast(null) }}
            className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {openChats.map((chat) => (
        <ChatWindow
          key={chat.member.id}
          member={chat.member}
          messages={chat.messages}
          minimized={chat.minimized}
          onClose={() => closeChat(chat.member.id)}
          onMinimize={() => toggleMin(chat.member.id)}
          onSend={(content) => sendMessage(chat.member.id, content)}
        />
      ))}

      {/* FAB + picker */}
      <div className="relative flex-shrink-0">
        {pickerOpen && (
          <div className="glass-card w-64 animate-slide-up absolute bottom-16 right-0">
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold text-white">Team</p>
              <button onClick={() => setPickerOpen(false)} className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
              {members.map((member) => (
                <button key={member.id} onClick={() => openChat(member)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/7 transition-colors text-left">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}>
                      {member.avatar}
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
            width:         '52px',
            height:        '52px',
            background:    pickerOpen
              ? 'var(--bolt-accent)'
              : 'linear-gradient(135deg, rgba(79,70,229,0.85) 0%, rgba(99,102,241,0.75) 100%)',
            backdropFilter:'blur(20px)',
            boxShadow:     '0 4px 20px rgba(79,70,229,0.45)',
            border:        '1px solid rgba(99,102,241,0.5)',
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
