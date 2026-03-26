'use client'

import { useState } from 'react'
import { teamMembers, TeamMember } from '@/lib/mock-data'
import { MessageCircle, Users } from 'lucide-react'
import ChatPanel from './ChatPanel'

export default function MemberBoard() {
  const [activeChat, setActiveChat] = useState<TeamMember | null>(null)

  const online  = teamMembers.filter((m) => m.online)
  const offline = teamMembers.filter((m) => !m.online)

  return (
    <div className="flex gap-5 h-[calc(100vh-12rem)]">
      {/* Member list */}
      <div className={`flex flex-col gap-5 transition-all duration-300 ${activeChat ? 'hidden md:flex md:w-80 flex-shrink-0' : 'w-full'}`}>
        {/* Online */}
        <div className="glass-card p-5 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#c0392b]" />
            <h2 className="text-sm font-semibold text-white">Team Members</h2>
            <span className="ml-auto text-xs text-white/40">{teamMembers.length} total</span>
          </div>

          {/* Online section */}
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400/70 mb-2">
              Online — {online.length}
            </p>
            <div className="space-y-1">
              {online.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  active={activeChat?.id === member.id}
                  onClick={() => setActiveChat(activeChat?.id === member.id ? null : member)}
                />
              ))}
            </div>
          </div>

          {/* Offline section */}
          {offline.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">
                Offline — {offline.length}
              </p>
              <div className="space-y-1 opacity-60">
                {offline.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    active={activeChat?.id === member.id}
                    onClick={() => setActiveChat(activeChat?.id === member.id ? null : member)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      {activeChat && (
        <div className="flex-1">
          <ChatPanel
            member={activeChat}
            onClose={() => setActiveChat(null)}
          />
        </div>
      )}

      {/* Empty state */}
      {!activeChat && (
        <div className="hidden md:flex flex-1 glass-card items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-bolt-maroon/20 border border-bolt-maroon/30 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-[#c0392b]" />
            </div>
            <p className="text-sm font-semibold text-white">Select a team member</p>
            <p className="text-xs text-white/40 mt-1">Click on someone to start chatting</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MemberRow({
  member,
  active,
  onClick,
}: {
  member: TeamMember
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${
        active
          ? 'bg-bolt-maroon/20 border border-bolt-maroon/40'
          : 'hover:bg-white/8 border border-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white ${
          active ? 'bg-bolt-maroon border border-bolt-maroon-light' : 'bg-bolt-maroon/40 border border-bolt-maroon/50'
        }`}>
          {member.avatar}
        </div>
        {member.online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-bolt-bg" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{member.name}</p>
        <p className="text-[11px] text-white/40 truncate">{member.role}</p>
      </div>
      <MessageCircle className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
        active ? 'text-[#c0392b]' : 'text-white/20 group-hover:text-white/50'
      }`} />
    </button>
  )
}
