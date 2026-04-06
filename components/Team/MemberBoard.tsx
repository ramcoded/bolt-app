'use client'

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import type { TeamMember } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'
import { useAuth } from '@/lib/auth-context'
import { useOnlineIds } from '@/lib/presence-context'
import ChatPanel from './ChatPanel'

export default function MemberBoard({ teamId }: { teamId?: string }) {
  const { profile } = useAuth()
  const onlineIds   = useOnlineIds()
  const [members,    setMembers]    = useState<TeamMember[]>([])
  const [activeChat, setActiveChat] = useState<TeamMember | null>(null)
  const [loaded,     setLoaded]     = useState(false)

  useEffect(() => {
    const url = teamId ? `/api/team?teamId=${teamId}` : '/api/team'
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMembers(data) })
      .finally(() => setLoaded(true))
  }, [teamId])

  // Prepend current user as always-online (can't chat with yourself so no onClick)
  const self: TeamMember | null = profile
    ? {
        id:       profile.id,
        name:     profile.name + ' (You)',
        role:     profile.role,
        avatar:   profile.avatar ?? profile.name.slice(0, 2).toUpperCase(),
        online:   true,
        lastSeen: undefined,
      }
    : null

  const otherMembers = members.filter((m) => m.id !== profile?.id)
  const allMembers = (self ? [self, ...otherMembers] : otherMembers).map((m) => ({
    ...m,
    online: m.id === profile?.id ? true : onlineIds.has(m.id),
  }))
  const online  = allMembers.filter((m) => m.online)
  const offline = allMembers.filter((m) => !m.online)

  return (
    <div className="flex gap-4 h-[calc(100svh-10rem)] md:h-[calc(100vh-12rem)]">
      {/* Member list */}
      <div
        className={`flex-shrink-0 flex flex-col transition-all duration-300 ${
          activeChat ? 'hidden md:flex md:w-72' : 'w-full md:w-72'
        }`}
      >
        <div className="glass-card flex-1 overflow-y-auto">
          <div className="sticky top-0 px-4 pt-4 pb-3"
            style={{ background: 'linear-gradient(180deg, rgba(10,10,15,0.9) 80%, transparent 100%)' }}>
            <h2 className="text-sm font-semibold text-white">Members</h2>
            <p className="text-xs text-white/35 mt-0.5">{allMembers.length} total · {online.length} online</p>
          </div>

          <div className="px-2 pb-4 space-y-4">
            {online.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400/60 px-2 mb-1">Online</p>
                {online.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    active={activeChat?.id === member.id}
                    onClick={member.id === profile?.id ? () => {} : () => setActiveChat(activeChat?.id === member.id ? null : member)}
                  />
                ))}
              </div>
            )}

            {offline.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-2 mb-1">Offline</p>
                {offline.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    active={activeChat?.id === member.id}
                    onClick={() => setActiveChat(activeChat?.id === member.id ? null : member)}
                    dimmed
                  />
                ))}
              </div>
            )}

            {!loaded && otherMembers.length === 0 && (
              <p className="text-xs text-white/25 text-center py-8">Loading team…</p>
            )}
            {loaded && otherMembers.length === 0 && (
              <div className="text-center py-8 px-4">
                <p className="text-xs font-medium text-white/35">No teammates yet</p>
                <p className="text-[11px] text-white/20 mt-1">Team members will appear here once added by a manager</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {activeChat ? (
          <ChatPanel member={activeChat} onClose={() => setActiveChat(null)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-8 hidden md:flex">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(79,70,229,0.10)', border: '1px solid rgba(79,70,229,0.18)' }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: '#6366f1', opacity: 0.7 }} />
            </div>
            <p className="text-sm font-medium text-white/50">
              {loaded && otherMembers.length === 0 ? 'No teammates yet' : 'Select a team member'}
            </p>
            <p className="text-xs text-white/25 mt-1">
              {loaded && otherMembers.length === 0
                ? 'Your manager will add team members to chat with'
                : 'Click anyone on the left to start chatting'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MemberRow({
  member, active, onClick, dimmed = false,
}: {
  member: TeamMember
  active: boolean
  onClick: () => void
  dimmed?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left"
      style={
        active
          ? { background: 'rgba(79,70,229,0.14)', border: '1px solid rgba(79,70,229,0.30)' }
          : { border: '1px solid transparent', opacity: dimmed ? 0.45 : 1 }
      }
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden"
          style={
            active
              ? { background: 'var(--bolt-accent)', boxShadow: '0 0 10px rgba(79,70,229,0.4)' }
              : { background: 'rgba(79,70,229,0.2)', border: '1px solid rgba(79,70,229,0.30)' }
          }
        >
          <AvatarImage src={member.avatar} alt={member.name} />
        </div>
        {member.online && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
            style={{ borderColor: '#0a0a0f' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">{member.name}</p>
        <p className="text-[11px] text-white/35 truncate">{member.role}</p>
      </div>
      {active && <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#6366f1' }} />}
    </button>
  )
}
