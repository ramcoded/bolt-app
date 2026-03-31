-- ============================================================
-- 007_leave_requests_hours.sql
-- Replace time_start / time_end on OT requests with a simpler
-- `hours` field. The actual computed times are stored in
-- schedule_overrides when the request is granted.
-- ============================================================

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS hours NUMERIC(4,1);
