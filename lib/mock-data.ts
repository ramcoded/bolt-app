export type TimeRecord = {
  id: string
  date: string // YYYY-MM-DD
  timeIn: string // HH:MM
  timeOut: string | null // HH:MM or null if still in
  duration: number | null // minutes
}

export type TeamMember = {
  id: string
  name: string
  role: string
  avatar: string
  online: boolean
  lastSeen?: string
}

export type CalendarTask = {
  id: string
  date: string // YYYY-MM-DD
  title: string
  description: string
  color: string
  priority: 'low' | 'medium' | 'high'
  completed?: boolean
}

export type CalendarNote = {
  date: string // YYYY-MM-DD
  content: string
}

export type Notification = {
  id: string
  title: string
  description: string
  time: string
  read: boolean
  type: 'task' | 'reminder' | 'alert'
}

export type ChatMessage = {
  id: string
  senderId: string
  content: string
  timestamp: string
  read: boolean
}

export type Conversation = {
  memberId: string
  messages: ChatMessage[]
}

// --- Mock Data ---

export const timeRecords: TimeRecord[] = [
  { id: '1',  date: '2026-03-21', timeIn: '08:02', timeOut: null,    duration: null },
  { id: '2',  date: '2026-03-20', timeIn: '08:00', timeOut: '17:05', duration: 545 },
  { id: '3',  date: '2026-03-19', timeIn: '08:15', timeOut: '17:00', duration: 525 },
  { id: '4',  date: '2026-03-18', timeIn: '07:55', timeOut: '16:58', duration: 543 },
  { id: '5',  date: '2026-03-17', timeIn: '08:10', timeOut: '17:15', duration: 545 },
  { id: '6',  date: '2026-03-16', timeIn: '08:00', timeOut: '17:00', duration: 540 },
  { id: '7',  date: '2026-03-13', timeIn: '08:05', timeOut: '17:10', duration: 545 },
  { id: '8',  date: '2026-03-12', timeIn: '08:00', timeOut: '17:00', duration: 540 },
  { id: '9',  date: '2026-03-11', timeIn: '08:20', timeOut: '17:05', duration: 525 },
  { id: '10', date: '2026-03-10', timeIn: '07:50', timeOut: '16:55', duration: 545 },
]

export const teamMembers: TeamMember[] = [
  { id: '1', name: 'Alex Rivera',   role: 'Team Lead',         avatar: 'AR', online: true  },
  { id: '2', name: 'Jordan Kim',    role: 'Frontend Dev',      avatar: 'JK', online: true  },
  { id: '3', name: 'Sam Torres',    role: 'Backend Dev',       avatar: 'ST', online: false, lastSeen: '2h ago' },
  { id: '4', name: 'Morgan Patel',  role: 'UI/UX Designer',    avatar: 'MP', online: true  },
  { id: '5', name: 'Casey Chen',    role: 'QA Engineer',       avatar: 'CC', online: false, lastSeen: '30m ago' },
  { id: '6', name: 'Riley Johnson', role: 'DevOps',            avatar: 'RJ', online: true  },
  { id: '7', name: 'Drew Martinez', role: 'Product Manager',   avatar: 'DM', online: false, lastSeen: '1h ago' },
  { id: '8', name: 'Quinn Adams',   role: 'Data Analyst',      avatar: 'QA', online: true  },
]

export const calendarTasks: CalendarTask[] = [
  { id: '1', date: '2026-03-21', title: 'Sprint Review',      description: 'Weekly sprint review with the full team. Present completed features and demo.', color: '#8B1A1A', priority: 'high'   },
  { id: '2', date: '2026-03-21', title: 'API Integration',    description: 'Connect the time-tracking module to the backend REST API.', color: '#1a4a8b', priority: 'high'   },
  { id: '3', date: '2026-03-23', title: 'Design Review',      description: 'Review new UI mockups with the design team and stakeholders.', color: '#1a7a4a', priority: 'medium' },
  { id: '4', date: '2026-03-25', title: 'Deployment',         description: 'Deploy v1.2 to staging environment. Run smoke tests post-deploy.', color: '#7a4a1a', priority: 'high'   },
  { id: '5', date: '2026-03-26', title: 'Team Standup',       description: 'Daily standup — blockers, progress update.', color: '#4a1a7a', priority: 'low'    },
  { id: '6', date: '2026-03-28', title: 'Code Freeze',        description: 'Feature freeze for Q1 release. Only critical bug fixes after this.', color: '#8B1A1A', priority: 'high'   },
  { id: '7', date: '2026-03-15', title: 'Retrospective',      description: 'Q1 sprint retrospective — what went well, what to improve.', color: '#1a6a7a', priority: 'medium' },
  { id: '8', date: '2026-04-01', title: 'Q2 Planning',        description: 'Kickoff Q2 roadmap planning session.', color: '#1a4a8b', priority: 'medium' },
]

export const calendarNotes: CalendarNote[] = [
  { date: '2026-03-21', content: 'Remind team about sprint review at 3pm' },
  { date: '2026-03-23', content: 'Book the Zoom room for design review' },
]

export const notifications: Notification[] = [
  { id: '1', title: 'Sprint Review assigned',    description: 'You have been added to the Sprint Review task on Mar 21.', time: '10m ago',  read: false, type: 'task'     },
  { id: '2', title: 'Time-in reminder',          description: 'Your scheduled time-in is in 30 minutes.',                  time: '25m ago',  read: false, type: 'reminder' },
  { id: '3', title: 'API Integration due soon',  description: 'Task "API Integration" is due tomorrow.',                   time: '1h ago',   read: true,  type: 'task'     },
  { id: '4', title: 'Code Freeze approaching',   description: 'Code freeze is scheduled for Mar 28 — 7 days away.',        time: '3h ago',   read: true,  type: 'alert'    },
  { id: '5', title: 'Morgan Patel mentioned you', description: 'Morgan mentioned you in a comment on "Design Review".',    time: '5h ago',   read: true,  type: 'task'     },
]

export const mockConversations: Record<string, ChatMessage[]> = {
  '1': [
    { id: '1', senderId: '1', content: 'Hey! Sprint review is at 3pm today.', timestamp: '09:10', read: true },
    { id: '2', senderId: 'me', content: 'Got it, I\'ll be there!', timestamp: '09:12', read: true },
    { id: '3', senderId: '1', content: 'Great, see you then.', timestamp: '09:13', read: false },
  ],
  '2': [
    { id: '1', senderId: '2', content: 'Can you review my PR when you get a chance?', timestamp: '08:45', read: true },
    { id: '2', senderId: 'me', content: 'Sure, linking it?', timestamp: '08:50', read: true },
  ],
  '4': [
    { id: '1', senderId: '4', content: 'New mockups are ready for review.', timestamp: '10:00', read: false },
  ],
}

// Dashboard graph — hours per day for past 7 days
export const weeklyHours = [
  { day: 'Mon', hours: 9.05 },
  { day: 'Tue', hours: 8.75 },
  { day: 'Wed', hours: 9.08 },
  { day: 'Thu', hours: 9.25 },
  { day: 'Fri', hours: 9.08 },
  { day: 'Sat', hours: 0    },
  { day: 'Sun', hours: 0    },
]

// Next scheduled time-in (used for reminder logic)
export const nextScheduledTimeIn  = '08:00' // HH:MM
export const nextScheduledTimeOut = '17:00' // HH:MM
