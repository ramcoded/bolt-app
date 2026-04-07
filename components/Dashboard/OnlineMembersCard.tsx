'use client'

import { useEffect, useState, useRef } from 'react'
import type { TeamMember } from '@/lib/mock-data'
import AvatarImage from '@/components/AvatarImage'
import { useAuth } from '@/lib/auth-context'
import { useOnlineIds } from '@/lib/presence-context'
import { Users, ChevronDown, Check } from 'lucide-react'

type Team = { id: string; name: string }

export default function OnlineMembersCard() {
  const { profile } = useAuth()
  const onlineIds   = useOnlineIds()

  const [teams,          setTeams]          = useState<Team[]>([])
  const [activeTeamId,   setActiveTeamId]   = useState<string | null>(null)
  const [members,        setMembers]        = useState<TeamMember[]>([])
  const [teamsLoaded,    setTeamsLoaded]    = useState(false)
  const [membersLoaded,  setMembersLoaded]  = useState(false)
  const [dropOpen,       setDropOpen]       = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Load teams list
  useEffect(() => {
    fetch('/api/teams', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const list: Team[] = data.teams ?? []
        setTeams(list)
        if (list.length > 0) setActiveTeamId(list[0].id)
      })
      .finally(() => setTeamsLoaded(true))
  }, [])

  // Load members when active team changes
  useEffect(() => {
    if (!teamsLoaded) return
    setMembersLoaded(false)
    const url = activeTeamId ? `/api/team?teamId=${activeTeamId}` : '/api/team'
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMembers(data) })
      .finally(() => setMembersLoaded(true))
  }, [activeTeamId, teamsLoaded])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
  const allMembers   = (self ? [self, ...otherMembers] : otherMembers).map((m) => ({
    ...m,
    online: m.id === profile?.id ? true : onlineIds.has(m.id),
  }))
  const online  = allMembers.filter((m) => m.online)
  const offline = allMembers.filter((m) => !m.online)

  const activeTeam = teams.find((t) => t.id === activeTeamId)
  const multiTeam  = teams.length > 1

  return (
    <div className="glass-card p-5 flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-white">Team Status</h2>
          <p className="text-xs text-white/40 mt-0.5">
            {membersLoaded ? `${online.length} online now` : 'Loading…'}
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-400">
            {membersLoaded ? `${online.length}/${allMembers.length}` : '—'}
          </span>
        </div>
      </div>

      {/* ── Team tabs (≤4 teams) or dropdown (>4) ── */}
      {teamsLoaded && teams.length > 1 && (
        <div className="mb-3 flex-shrink-0">
          {multiTeam && teams.length <= 4 ? (
            /* Tabs */
            <div
              className="flex rounded-xl p-0.5 gap-0.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all truncate"
                  style={
                    activeTeamId === team.id
                      ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' }
                      : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
                  }
                >
                  {team.name}
                </button>
              ))}
            </div>
          ) : (
            /* Dropdown for >4 teams */
            <div ref={dropRef} className="relative">
              <button
                onClick={() => setDropOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: 'rgba(99,102,241,0.10)',
                  border:     '1px solid rgba(99,102,241,0.25)',
                  color:      '#a5b4fc',
                }}
              >
                <Users className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
                <span className="flex-1 truncate text-left">{activeTeam?.name ?? 'Select team'}</span>
                <ChevronDown
                  className="w-3.5 h-3.5 flex-shrink-0 text-white/40 transition-transform"
                  style={{ transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {dropOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                  style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                >
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => { setActiveTeamId(team.id); setDropOpen(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-all text-left"
                      style={
                        activeTeamId === team.id
                          ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }
                          : { color: 'rgba(255,255,255,0.5)' }
                      }
                      onMouseEnter={(e) => { if (activeTeamId !== team.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={(e) => { if (activeTeamId !== team.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <Users className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1 truncate">{team.name}</span>
                      {activeTeamId === team.id && <Check className="w-3 h-3 flex-shrink-0 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Member list ── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5" style={{ scrollbarWidth: 'none' }}>
        {online.map((member) => (
          <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors">
            <div className="relative flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden"
                style={{ background: 'rgba(79,70,229,0.25)', border: '2px solid rgba(99,102,241,0.55)' }}
              >
                <AvatarImage src={member.avatar} alt={member.name} />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
                style={{ borderColor: 'var(--bolt-bg)' }}
              />
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
            <div className="my-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            {offline.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl opacity-40">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white/50 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.12)' }}
                  >
                    <AvatarImage src={member.avatar} alt={member.name} />
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'var(--bolt-bg)' }}
                  />
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

        {!membersLoaded && (
          <p className="text-xs text-white/25 text-center py-4">Loading…</p>
        )}
        {membersLoaded && allMembers.length === 0 && (
          <p className="text-xs text-white/25 text-center py-4">No members yet.</p>
        )}
      </div>
    </div>
  )
}
