# ⚡ BOLT — Team Productivity & Time Tracking Platform

> **Status: 🚧 Under Active Development**

BOLT is a real-time team productivity dashboard built for internal use. It combines time tracking, team presence, task management, and live messaging into a single dark-glass UI.

---

## Features

### ✅ Implemented
- **Authentication** — Supabase-based login/logout with server-side session handling
- **Time Tracking** — Clock in/out with confirmation modal, daily records, duration tracking
- **Timeline** — Personal and manager views of time records with sorting and filtering
- **Dashboard** — Live clock, weekly hours graph, upcoming tasks, team online status
- **Team Presence** — Real-time online/offline status via Supabase Realtime broadcast channels
- **Chat System** — Floating chat windows (auto-popup on message), typing indicators, read receipts, mute per user, notification sound
- **Notifications** — In-app notification bell with real-time inserts and mark-as-read
- **Profile Page** — Stats overview, recent activity, avatar upload (reflects across all accounts)
- **Manager Dashboard** — Team time record overview and stats (manager role only)
- **Calendar** — Task scheduling with color-coded events
- **Tasks** — Create, view, and manage personal tasks

### 🚧 In Progress / Planned
- Manager approval workflow for time records
- Advanced reporting and export (CSV/PDF)
- Task assignment between team members
- Calendar sync / iCal integration
- Push notifications
- Mobile responsive polish
- Role-based permissions refinement

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) — App Router, Server Components |
| Language | TypeScript |
| Database & Auth | [Supabase](https://supabase.com/) — PostgreSQL + Auth + Realtime |
| Storage | Supabase Storage (avatar images) |
| Styling | Tailwind CSS + custom glass design system |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Deployment | Vercel (recommended) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project

### 1. Clone & Install

```bash
git clone https://github.com/your-username/bolt-app.git
cd bolt-app
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Supabase Setup

Run the following in your Supabase SQL editor:

```sql
-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text check (role in ('manager', 'employee')) default 'employee',
  department text,
  avatar text,
  online boolean default false,
  last_seen timestamptz
);

-- Time records
create table time_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  date date not null,
  time_in text,
  time_out text,
  duration integer, -- minutes
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Notifications
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  type text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  date date,
  priority text check (priority in ('low', 'medium', 'high')) default 'low',
  color text,
  completed boolean default false,
  created_at timestamptz default now()
);
```

Enable **Realtime** on the `messages` and `notifications` tables in Supabase Dashboard → Database → Replication.

### 4. Storage Bucket

In Supabase Dashboard → Storage:
- Create a bucket named **`avatars`**
- Set it to **Public**

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
bolt-app/
├── app/
│   ├── api/                  # API routes (messages, tasks, time-records, team, notifications, profile)
│   ├── (pages)/              # Dashboard, timeline, calendar, tasks, team, profile, manager
│   └── globals.css           # Glass design system tokens
├── components/
│   ├── Chat/                 # Floating chat windows (ChatTabs, ChatWindow)
│   ├── Dashboard/            # ProfileCard, OnlineMembersCard, ReminderCard, TimelineGraphCard
│   ├── Profile/              # ProfileDropdown
│   ├── Team/                 # MemberBoard, ChatPanel
│   ├── Timeline/             # TimelineList, ManagerTimeline
│   ├── Calendar/             # GlassCalendar, DayCell
│   ├── AvatarImage.tsx       # Smart avatar: renders image URL or text initials
│   ├── NavBar.tsx
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

- **Background**: `#000000` → `#0a0a0f`
- **Accent**: `#4f46e5` (indigo)
- **Glass cards**: `rgba(255,255,255,0.04)` background + `rgba(120,110,255,0.10)` border + `blur(20px)`
- **Dropdowns/modals**: `rgba(12,12,20,0.96)` — nearly opaque for readability

---

## Contributing

This project is under active development. If you're contributing:

1. Branch off `main`
2. Keep PRs focused — one feature or fix per PR
3. Test both employee and manager role flows before submitting

---

## License

Private — internal use only.
