# BOLT — Team Productivity & Time Tracking Platform

> Status: Under Active Development

BOLT is a real-time team productivity dashboard built for internal use. It combines time tracking, team presence, task management, and live messaging into a single dark-glass UI.

---

## Features

### Implemented

- **Authentication** — Supabase-based login/logout with OAuth provider support, server-side session handling, and role assignment (manager vs. member) on first sign-in
- **Multi-team Support** — Team isolation across all data; managers and members are scoped to their own team with RLS enforcement at the database level
- **Time Tracking** — Clock in/out with confirmation modal, daily records, and duration tracking
- **Timeline** — Personal and manager views of time records with sorting and filtering; CSV/PDF export
- **Dashboard** — Live clock, weekly hours graph, upcoming tasks, and team online status
- **Team Presence** — Real-time online/offline status via Supabase Realtime broadcast channels
- **Chat System** — Floating chat windows with auto-popup on new message, typing indicators, read receipts, per-user mute, and notification sound
- **Notifications** — In-app notification bell with real-time delivery, mark-as-read, and manager alerts when tasks are completed
- **Profile Page** — Stats overview, recent activity, and avatar upload (reflects across all sessions)
- **Manager Dashboard** — Team time record overview and stats (manager role only)
- **Calendar** — Task scheduling with color-coded events per priority
- **Tasks** — Managers can assign tasks to one or multiple team members with priority, deadline, and description. Members mark tasks as done via a confirmation flow. Completed tasks are permanent (cannot be reopened), grayed out with a "Finished" badge, and trigger a notification to the manager.
- **Role-based Access Control** — Managers control task creation, deletion, and team visibility; members can only update the completion status of tasks assigned to them
- **Leave and Overtime Requests** — Members can submit overtime (post-shift, pre-shift) and time-off requests with a reason and hours. Requests are reviewed by the manager who can approve or reject with an optional note. Approval automatically updates the member's schedule with the correct adjusted times.
- **Schedule Override Propagation** — When a request is approved, a schedule override is written for the member's specific date. The corrected times (or day-off marker) are reflected across the dashboard weekly view, the timeline weekly schedule card, and the calendar.
- **Request Notifications** — Submitting a request immediately notifies the manager in real time. Approval or rejection immediately notifies the requesting member. Delivery uses both database inserts and Supabase Realtime broadcast to guarantee instant arrival without requiring table replication configuration.
- **Team Group Chat** — A shared real-time group chat scoped to each team. All team members participate in one channel. Messages show sender avatars and names with consecutive-message collapsing. Accessible from the floating chat button (Team Chat entry at the top of the picker) and embedded directly on the Team page alongside the member board. Messages persist in the database and are delivered via Supabase broadcast for instant updates.
- **Personal Notes Panel** — A collapsible notes panel anchored to the left edge of the screen, available on every page. Content is saved per account to the database with a one-second debounce auto-save and a visible saving/saved indicator. Notes are private and isolated by user.
- **Profile Clock Status** — The profile card on the dashboard accurately reflects whether the user is currently clocked in or clocked out, using the active session state rather than just the presence of a time record.

### Planned

- Advanced reporting and analytics
- Calendar sync / iCal integration
- Push notifications
- Mobile responsive polish

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router, Server Components |
| Language | TypeScript |
| Database & Auth | Supabase — PostgreSQL + Auth + Realtime |
| Storage | Supabase Storage (avatar images) |
| Styling | Tailwind CSS + custom glass design system |
| Charts | Recharts |
| Icons | Lucide React |
| Deployment | Vercel (recommended) |

---

## Project Structure

```
bolt-app/
├── app/
│   ├── api/                  # API routes (messages, tasks, time-records, team, notifications, profile)
│   ├── (pages)/              # Dashboard, timeline, calendar, tasks, team, profile, manager
│   └── globals.css           # Glass design system tokens
├── components/
│   ├── Chat/                 # ChatTabs, ChatWindow, GroupChatWindow
│   ├── Dashboard/            # ProfileCard, OnlineMembersCard, ReminderCard, TimelineGraphCard, ScheduleCard
│   ├── Profile/              # ProfileDropdown
│   ├── Team/                 # MemberBoard, GroupChatPanel
│   ├── Timeline/             # TimelineList, ManagerTimeline, ScheduleCard
│   ├── Calendar/             # GlassCalendar, DayCell
│   ├── AvatarImage.tsx       # Smart avatar: renders image URL or text initials
│   ├── NavBar.tsx
│   ├── NotesPanel.tsx        # Collapsible per-user notes panel (left edge, all pages)
│   └── AppShell.tsx
└── lib/
    ├── auth-context.tsx      # Auth + profile state (client)
    ├── presence-context.tsx  # Real-time online IDs
    ├── time-records-context.tsx
    └── supabase/             # Client + server Supabase helpers
```

---

## Design System

BOLT uses a custom dark glass aesthetic:

- **Background**: `#000000` to `#0a0a0f`
- **Accent**: `#4f46e5` (indigo)
- **Glass cards**: `rgba(255,255,255,0.04)` background + `rgba(120,110,255,0.10)` border + `blur(20px)`
- **Dropdowns/modals**: `rgba(12,12,20,0.96)` — nearly opaque for readability

---

## Contributing

This project is under active development. If you're contributing:

1. Branch off `main`
2. Keep PRs focused — one feature or fix per PR
3. Test both member and manager role flows before submitting

---

## Development Approach

This project was built using an agentic development workflow powered by [Claude Code](https://claude.ai/code) (Anthropic) with the [oh-my-claudecode](https://github.com/oh-my-claudecode/oh-my-claudecode) (OMC) orchestration layer.

Rather than writing code manually, features were developed through conversational prompts and autonomous multi-agent execution. The OMC autopilot skill handled the full cycle — requirements analysis, technical planning, parallel implementation, code review, and validation — for each feature.

Key aspects of the workflow:

- **Autopilot mode** — end-to-end feature delivery from a plain-language description
- **Parallel agent execution** — independent tasks (exploration, implementation, review) ran concurrently via specialized subagents (architect, executor, code-reviewer, security-reviewer)
- **Iterative refinement** — multi-perspective validation with automatic fix cycles before marking work complete
- **Context-aware edits** — agents read existing code before making changes, preserving patterns and architecture

---

## License

Private — internal use only.
