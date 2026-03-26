'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { teamMembers, mockConversations, ChatMessage } from '@/lib/mock-data'
import { TeamMember } from '@/lib/mock-data'
import ChatWindow from './ChatWindow'

type OpenChat = {
  member: TeamMember
  minimized: boolean
  messages: ChatMessage[]
}

export default function ChatTabs() {
  const [openChats, setOpenChats] = useState<OpenChat[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const openChat = (member: TeamMember) => {
    const already = openChats.find((c) => c.member.id === member.id)
    if (already) {
      setOpenChats((prev) =>
        prev.map((c) => (c.member.id === member.id ? { ...c, minimized: false } : c))
      )
    } else {
      setOpenChats((prev) => [
        ...prev,
        {
          member,
          minimized: false,
          messages: mockConversations[member.id] ?? [],
        },
      ])
    }
    setPickerOpen(false)
  }

  const closeChat = (memberId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.member.id !== memberId))
  }

  const toggleMinimize = (memberId: string) => {
    setOpenChats((prev) =>
      prev.map((c) => (c.member.id === memberId ? { ...c, minimized: !c.minimized } : c))
    )
  }

  const sendMessage = (memberId: string, content: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      read: true,
    }
    setOpenChats((prev) =>
      prev.map((c) =>
        c.member.id === memberId
          ? { ...c, messages: [...c.messages, newMsg] }
          : c
      )
    )
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-2">
      {/* Open chat windows */}
      {openChats.map((chat) => (
        <ChatWindow
          key={chat.member.id}
          member={chat.member}
          messages={chat.messages}
          minimized={chat.minimized}
          onClose={() => closeChat(chat.member.id)}
          onMinimize={() => toggleMinimize(chat.member.id)}
          onSend={(content) => sendMessage(chat.member.id, content)}
        />
      ))}

      {/* Member picker popup */}
      {pickerOpen && (
        <div className="glass-card w-64 mb-1 animate-slide-up">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <p className="text-xs font-semibold text-white">Team</p>
            <button
              onClick={() => setPickerOpen(false)}
              className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto p-2 space-y-1">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => openChat(member)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-bolt-maroon/40 border border-bolt-maroon/50 flex items-center justify-center text-xs font-bold text-white">
                    {member.avatar}
                  </div>
                  {member.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border-2 border-bolt-bg" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{member.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{member.role}</p>
                </div>
                {member.online ? (
                  <span className="text-[10px] text-green-400 font-medium">Online</span>
                ) : (
                  <span className="text-[10px] text-white/30">{member.lastSeen}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat toggle tab */}
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        className="flex items-center gap-2 px-4 py-2 mb-0 glass-card rounded-t-xl rounded-b-none border-b-0 hover:bg-white/10 transition-all duration-200 group"
      >
        <MessageCircle className="w-4 h-4 text-[#c0392b] group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold text-white">Chat</span>
        {openChats.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-bolt-maroon text-white text-[10px] flex items-center justify-center font-bold">
            {openChats.length}
          </span>
        )}
      </button>
    </div>
  )
}
