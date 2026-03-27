import ProfileCard         from '@/components/Dashboard/ProfileCard'
import TimelineGraphCard  from '@/components/Dashboard/TimelineGraphCard'
import OnlineMembersCard  from '@/components/Dashboard/OnlineMembersCard'
import ReminderCard       from '@/components/Dashboard/ReminderCard'
import NotificationsCard  from '@/components/Dashboard/NotificationsCard'
import ScheduleCard       from '@/components/Dashboard/ScheduleCard'
import TodayHoursCard    from '@/components/Dashboard/TodayHoursCard'

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-1">Welcome back — here&apos;s your overview.</p>
      </div>

      {/* Schedule bar + today's mini card side by side */}
      <div className="mb-5 flex gap-4 items-stretch">
        <div className="flex-1 min-w-0">
          <ScheduleCard />
        </div>
        <div className="flex-shrink-0 w-44">
          <TodayHoursCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Profile card — full width on mobile, 1 col on lg */}
        <div className="md:col-span-2 lg:col-span-1">
          <ProfileCard />
        </div>

        {/* Weekly graph — spans 2 cols on lg */}
        <div className="lg:col-span-2">
          <TimelineGraphCard />
        </div>

        {/* Online members */}
        <div className="lg:col-span-1">
          <OnlineMembersCard />
        </div>

        {/* Reminders */}
        <div className="lg:col-span-1">
          <ReminderCard />
        </div>

        {/* Notifications */}
        <div className="lg:col-span-1">
          <NotificationsCard />
        </div>

      </div>
    </div>
  )
}
