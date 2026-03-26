import GlassCalendar from '@/components/Calendar/GlassCalendar'

export default function CalendarPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-sm text-white/40 mt-1">Tasks, reminders, and notes at a glance.</p>
      </div>
      <GlassCalendar />
    </div>
  )
}
