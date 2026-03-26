import ReminderBanner from '@/components/Timeline/ReminderBanner'
import TimelineList    from '@/components/Timeline/TimelineList'

export default function TimelinePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Timeline</h1>
        <p className="text-sm text-white/40 mt-1">Your time-in and time-out history.</p>
      </div>

      <div className="space-y-5">
        <ReminderBanner />
        <TimelineList />
      </div>
    </div>
  )
}
