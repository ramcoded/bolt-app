import { createClient }       from '@/lib/supabase/server'
import { redirect }           from 'next/navigation'
import ReminderBanner         from '@/components/Timeline/ReminderBanner'
import TimelineList           from '@/components/Timeline/TimelineList'
import ManagerTimelineTabs    from '@/components/Timeline/ManagerTimelineTabs'

export default async function TimelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let isManager = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isManager = profile?.role === 'manager'
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Timeline</h1>
        <p className="text-sm text-white/40 mt-1">
          {isManager
            ? 'View time-in and time-out history for any team member.'
            : 'Your time-in and time-out history.'}
        </p>
      </div>

      <div className="space-y-5">
        {isManager ? (
          <ManagerTimelineTabs />
        ) : (
          <>
            <ReminderBanner />
            <TimelineList />
          </>
        )}
      </div>
    </div>
  )
}
