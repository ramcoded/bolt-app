-- Create the schedules table
-- Run this once in your Supabase project: Dashboard → SQL Editor → New Query → paste & run

create table if not exists public.schedules (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  day_of_week smallint    not null check (day_of_week between 0 and 6),
  time_in     text        not null,
  time_out    text        not null,
  created_at  timestamptz not null default now(),
  unique (user_id, day_of_week)
);

alter table public.schedules enable row level security;

-- Employees can read their own schedule
create policy "Users can read own schedule"
  on public.schedules
  for select
  using (auth.uid() = user_id);

-- Service role (used by the manager API) bypasses RLS automatically,
-- so no additional policies are needed for manager writes.
