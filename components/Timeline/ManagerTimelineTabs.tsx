'use client'

import { useState } from 'react'
import { User, Clock } from 'lucide-react'
import ReminderBanner from './ReminderBanner'
import TimelineList   from './TimelineList'
import ManagerTimeline from './ManagerTimeline'

type Tab = 'mine' | 'team'

export default function ManagerTimelineTabs() {
  const [tab, setTab] = useState<Tab>('mine')

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-2xl w-fit"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <TabBtn active={tab === 'mine'} onClick={() => setTab('mine')} icon={<Clock className="w-3.5 h-3.5" />} label="My Timeline" />
        <TabBtn active={tab === 'team'} onClick={() => setTab('team')} icon={<User  className="w-3.5 h-3.5" />} label="Team Timeline" />
      </div>

      {tab === 'mine' ? (
        <>
          <ReminderBanner />
          <TimelineList />
        </>
      ) : (
        <ManagerTimeline />
      )}
    </div>
  )
}

function TabBtn({ active, onClick, icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
      style={active ? {
        background:  'rgba(79,70,229,0.25)',
        border:      '1px solid rgba(79,70,229,0.4)',
        color:       '#a5b4fc',
      } : {
        background:  'transparent',
        border:      '1px solid transparent',
        color:       'rgba(255,255,255,0.35)',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
