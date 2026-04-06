'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, LogOut, Loader2, Plus } from 'lucide-react'
import MemberBoard from '@/components/Team/MemberBoard'
import GroupChatPanel from '@/components/Team/GroupChatPanel'

type Team = {
  id: string
  name: string
  createdBy: string | null
  joinedAt: string
}

export default function TeamPage() {
  const [teams,          setTeams]          = useState<Team[]>([])
  const [activeTeamId,   setActiveTeamId]   = useState<string | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [leavingTeamId,  setLeavingTeamId]  = useState<string | null>(null)
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null)

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
        }
      }
    } finally {
      setLeavingTeamId(null)
    }
  }

  const activeTeam = teams.find((t) => t.id === activeTeamId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-sm text-white/40 mt-1">Message your teammates directly.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <MemberBoard teamId={activeTeamId ?? undefined} />
        </div>

        {/* Group chats column */}
        <div className="xl:col-span-1 flex flex-col gap-4">

          {/* Team tabs */}
          {!loading && teams.length > 1 && (
            <div
              className="flex flex-wrap gap-2 p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setActiveTeamId(team.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    activeTeamId === team.id
                      ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }
                      : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid transparent' }
                  }
                >
                  <Users className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{team.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Active team group chat */}
          {loading ? (
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border:     '1px solid rgba(255,255,255,0.08)',
                height:     'min(560px, calc(100svh - 8rem))',
              }}
            >
              <p className="text-xs text-white/30">Loading teams…</p>
            </div>
          ) : teams.length === 0 ? (
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border:     '1px solid rgba(255,255,255,0.08)',
                height:     'min(560px, calc(100svh - 8rem))',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
              >
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-white/60">You&apos;re not in a team yet</p>
              <p className="text-xs text-white/30">A manager will add you to a team.</p>
            </div>
          ) : activeTeam ? (
            <GroupChatPanel
              key={activeTeam.id}
              initialTeamId={activeTeam.id}
              initialTeamName={activeTeam.name}
            />
          ) : null}

          {/* Leave Team button */}
          {!loading && activeTeam && (
            <div className="flex justify-end">
              {confirmLeaveId === activeTeam.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Leave &ldquo;{activeTeam.name}&rdquo;?</span>
                  <button
                    onClick={() => handleLeave(activeTeam.id)}
                    disabled={!!leavingTeamId}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-red-400 transition-all disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    {leavingTeamId === activeTeam.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <LogOut className="w-3 h-3" />}
                    Yes, leave
                  </button>
                  <button
                    onClick={() => setConfirmLeaveId(null)}
                    className="px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmLeaveId(activeTeam.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/35 hover:text-red-400 transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <LogOut className="w-3 h-3" />
                  Leave team
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
