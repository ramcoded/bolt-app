'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Users, LogOut, Loader2, MessageCircle, ChevronDown, Check } from 'lucide-react'
import MemberBoard from '@/components/Team/MemberBoard'
import GroupChatPanel from '@/components/Team/GroupChatPanel'
import ChatPanel from '@/components/Team/ChatPanel'
import type { TeamMember } from '@/lib/mock-data'

type Team = {
  id: string
  name: string
  createdBy: string | null
  joinedAt: string
}

type ChatView =
  | { type: 'group' }
  | { type: 'dm'; member: TeamMember }
  | null

export default function TeamPage() {
  const [teams,          setTeams]          = useState<Team[]>([])
  const [activeTeamId,   setActiveTeamId]   = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [leavingTeamId,  setLeavingTeamId]  = useState<string | null>(null)
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null)
  const [chatView,       setChatView]       = useState<ChatView>(null)
  const [teamDropOpen,   setTeamDropOpen]   = useState(false)
  const teamDropRef = useRef<HTMLDivElement>(null)

  const loadTeams = useCallback(async () => {
    try {
      const res  = await fetch('/api/teams')
      const data = await res.json()
      const list: Team[] = data.teams ?? []
      setTeams(list)
      if (list.length > 0 && !activeTeamId) {
        setActiveTeamId(list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [activeTeamId])

  useEffect(() => { loadTeams() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (teamDropRef.current && !teamDropRef.current.contains(e.target as Node)) {
        setTeamDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLeave = async (teamId: string) => {
    setLeavingTeamId(teamId)
    setConfirmLeaveId(null)
    try {
      const res = await fetch('/api/team/leave', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ teamId }),
      })
      if (res.ok) {
        const remaining = teams.filter((t) => t.id !== teamId)
        setTeams(remaining)
        if (activeTeamId === teamId) {
          setActiveTeamId(remaining[0]?.id ?? null)
          setChatView(null)
        }
      }
    } finally {
      setLeavingTeamId(null)
    }
  }

  const handleSelectTeam = (teamId: string) => {
    setActiveTeamId(teamId)
    setChatView(null)
  }

  const activeTeam = teams.find((t) => t.id === activeTeamId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-sm text-white/40 mt-1">Message your teammates directly.</p>
      </div>

      <div className="flex gap-6 h-[calc(100svh-10rem)] md:h-[calc(100vh-12rem)]">

        {/* ── Section 1: Nav panel ─────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-3">

          {/* Team dropdown */}
          {!loading && teams.length > 0 && (
            <div ref={teamDropRef} className="relative flex-shrink-0">
              <button
                onClick={() => setTeamDropOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: 'rgba(99,102,241,0.12)',
                  border:     '1px solid rgba(99,102,241,0.3)',
                  color:      '#a5b4fc',
                }}
              >
                <Users className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
                <span className="flex-1 truncate text-left">{activeTeam?.name ?? 'Select team'}</span>
                <ChevronDown
                  className="w-3.5 h-3.5 flex-shrink-0 text-white/40 transition-transform"
                  style={{ transform: teamDropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>

              {teamDropOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 flex flex-col"
                  style={{ background: 'rgba(18,18,28,0.97)', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                >
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => { handleSelectTeam(team.id); setTeamDropOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-all text-left"
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

          {/* Member nav list (group chat button + members) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {loading ? (
              <div className="glass-card h-full flex items-center justify-center">
                <p className="text-xs text-white/30">Loading…</p>
              </div>
            ) : teams.length === 0 ? (
              <div className="glass-card h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
                >
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-white/60">No team yet</p>
                <p className="text-xs text-white/30">A manager will add you.</p>
              </div>
            ) : (
              <MemberBoard
                key={activeTeamId ?? undefined}
                teamId={activeTeamId ?? undefined}
                onSelectMember={(member) => setChatView(member ? { type: 'dm', member } : null)}
                selectedMemberId={chatView?.type === 'dm' ? chatView.member.id : null}
                onSelectGroup={() => setChatView({ type: 'group' })}
                groupChatActive={chatView?.type === 'group'}
              />
            )}
          </div>

          {/* Leave team */}
          {!loading && activeTeam && (
            <div className="flex-shrink-0">
              {confirmLeaveId === activeTeam.id ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-white/50 text-center">Leave &ldquo;{activeTeam.name}&rdquo;?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLeave(activeTeam.id)}
                      disabled={!!leavingTeamId}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 transition-all disabled:opacity-50"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      {leavingTeamId === activeTeam.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                      Yes, leave
                    </button>
                    <button
                      onClick={() => setConfirmLeaveId(null)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeaveId(activeTeam.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-white/35 hover:text-red-400 transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <LogOut className="w-3 h-3" />
                  Leave team
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Section 2: Chat area ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {chatView?.type === 'group' && activeTeam ? (
            <GroupChatPanel
              key={activeTeam.id}
              initialTeamId={activeTeam.id}
              initialTeamName={activeTeam.name}
            />
          ) : chatView?.type === 'dm' ? (
            <ChatPanel
              member={chatView.member}
              onClose={() => setChatView(null)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(79,70,229,0.10)', border: '1px solid rgba(79,70,229,0.18)' }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: '#6366f1', opacity: 0.7 }} />
              </div>
              <p className="text-sm font-medium text-white/50">Select a conversation</p>
              <p className="text-xs text-white/25 mt-1">Choose Group Chat or a team member on the left</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
