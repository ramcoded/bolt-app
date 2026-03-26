import MemberBoard from '@/components/Team/MemberBoard'

export default function TeamPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-sm text-white/40 mt-1">Message your teammates directly.</p>
      </div>
      <MemberBoard />
    </div>
  )
}
