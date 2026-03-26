'use client'

import { useEffect, useState } from 'react'
import type { TeamMember } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'
import { useAuth } from '@/lib/auth-context'
import { useOnlineIds } from '@/lib/presence-context'

export default function OnlineMembersCard() {
  const { profile } = useAuth()
  const onlineIds   = useOnlineIds()
  const [members, setMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    fetch('/api/team', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMembers(data) })
  }, [])

  // Include the current user as always-online at the top
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

  const allMembers = (self ? [self, ...members] : members).map((m) => ({
    ...m,
    online: m.id === profile?.id ? true : onlineIds.has(m.id),
  }))
  const online  = allMembers.filter((m) => m.online)
  const offline = allMembers.filter((m) => !m.online)

  return (
    <div className="glass-card p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Team Status</h2>
          <p className="text-xs text-white/40 mt-0.5">{online.length} online now</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-400">{online.length}/{allMembers.length}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {online.map((member) => (
          <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/4 transition-colors">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'rgba(79,70,229,0.25)', border: '1px solid rgba(79,70,229,0.35)' }}>
                <AvatarImage src={member.avatar} alt={member.name} />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
                style={{ borderColor: 'var(--bolt-bg)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{member.name}</p>
              <p className="text-[10px] text-white/35 truncate">{member.role}</p>
            </div>
            <span className="text-[10px] text-green-400 font-medium flex-shrink-0">Online</span>
          </div>
        ))}

        {offline.length > 0 && (
          <>
            <div className="my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            {offline.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl opacity-40">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white/50"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <AvatarImage src={member.avatar} alt={member.name} />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'var(--bolt-bg)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/50 truncate">{member.name}</p>
                  <p className="text-[10px] text-white/25 truncate">{member.role}</p>
                </div>
                <span className="text-[10px] text-white/25 flex-shrink-0">{member.lastSeen}</span>
              </div>
            ))}
          </>
        )}

        {members.length === 0 && (
          <p className="text-xs text-white/25 text-center py-4">Loading team…</p>
        )}
      </div>
    </div>
  )
}
