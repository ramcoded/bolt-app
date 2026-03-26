import { teamMembers } from '@/lib/mock-data'
import { Users } from 'lucide-react'

export default function OnlineMembersCard() {
  const online = teamMembers.filter((m) => m.online)
  const offline = teamMembers.filter((m) => !m.online)

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Team Status</h2>
          <p className="text-xs text-white/40 mt-0.5">{online.length} online now</p>
        </div>
        <div className="flex items-center gap-1.5 bg-green-400/10 border border-green-400/20 rounded-xl px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-medium text-green-400">{online.length}/{teamMembers.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {online.map((member) => (
          <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-bolt-maroon/40 border border-bolt-maroon/50 flex items-center justify-center text-xs font-bold text-white">
                {member.avatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-bolt-bg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{member.name}</p>
              <p className="text-[10px] text-white/40 truncate">{member.role}</p>
            </div>
            <span className="text-[10px] text-green-400 font-medium flex-shrink-0">Online</span>
          </div>
        ))}

        {offline.length > 0 && (
          <>
            <div className="my-2 border-t border-white/5" />
            {offline.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl opacity-50">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                    {member.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white/20 border-2 border-bolt-bg" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/60 truncate">{member.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{member.role}</p>
                </div>
                <span className="text-[10px] text-white/30 flex-shrink-0">{member.lastSeen}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
