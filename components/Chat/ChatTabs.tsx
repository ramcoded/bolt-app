'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { teamMembers, mockConversations, ChatMessage, TeamMember } from '@/lib/mock-data'
import ChatWindow from './ChatWindow'

type OpenChat = { member: TeamMember; minimized: boolean; messages: ChatMessage[] }

export default function ChatTabs() {
  const [openChats,   setOpenChats]   = useState<OpenChat[]>([])
  const [pickerOpen,  setPickerOpen]  = useState(false)

  const openChat = (member: TeamMember) => {
    const already = openChats.find((c) => c.member.id === member.id)
    if (already) {
      setOpenChats((prev) => prev.map((c) => c.member.id === member.id ? { ...c, minimized: false } : c))
    } else {
      setOpenChats((prev) => [...prev, { member, minimized: false, messages: mockConversations[member.id] ?? [] }])
    }
    setPickerOpen(false)
  }

  const closeChat    = (id: string) => setOpenChats((prev) => prev.filter((c) => c.member.id !== id))
  const toggleMin    = (id: string) => setOpenChats((prev) => prev.map((c) => c.member.id === id ? { ...c, minimized: !c.minimized } : c))
  const sendMessage  = (id: string, content: string) => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      read: true,
    }
    setOpenChats((prev) => prev.map((c) => c.member.id === id ? { ...c, messages: [...c.messages, msg] } : c))
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
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

      {/* FAB + picker wrapper */}
      <div className="relative flex-shrink-0">
        {/* Picker popup */}
        {pickerOpen && (
          <div className="glass-card w-64 animate-slide-up absolute bottom-16 right-0">
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold text-white">Team</p>
              <button onClick={() => setPickerOpen(false)} className="p-1 rounded hover:bg-white/8 text-white/40 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2 space-y-0.5">
              {teamMembers.map((member) => (
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
            </div>
          </div>
        )}

        {/* Chat FAB */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="rounded-full flex items-center justify-center transition-all duration-200 group relative"
          style={{
            width: '52px',
            height: '52px',
            background: pickerOpen
              ? 'var(--bolt-accent)'
              : 'linear-gradient(135deg, rgba(79,70,229,0.85) 0%, rgba(99,102,241,0.75) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px rgba(79,70,229,0.45)',
            border: '1px solid rgba(99,102,241,0.5)',
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
