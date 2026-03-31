import MemberBoard from '@/components/Team/MemberBoard'
import GroupChatPanel from '@/components/Team/GroupChatPanel'

export default function TeamPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-sm text-white/40 mt-1">Message your teammates directly.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <MemberBoard />
        </div>
        <div className="xl:col-span-1">
          <GroupChatPanel />
        </div>
      </div>
    </div>
  )
}
