-- ============================================================
-- Rate limits table (database-backed, works on Vercel serverless)
-- ============================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rate_limits_key_created ON rate_limits(key, created_at);

-- No RLS policies on purpose — only service role (server-side) can access this table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Performance indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_time_records_user_id    ON time_records(user_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date        ON time_records(date);
CREATE INDEX IF NOT EXISTS idx_time_records_user_date   ON time_records(user_id, date);

CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id     ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read   ON messages(receiver_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read  ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created    ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to        ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_date               ON tasks(date);

CREATE INDEX IF NOT EXISTS idx_calendar_notes_user_date ON calendar_notes(user_id, date);

-- ============================================================
-- Fix notifications RLS: remove open insert policy.
-- All notification inserts now go through the server-side admin
-- client (service role bypasses RLS), so authenticated users
-- no longer need direct INSERT access.
-- ============================================================
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
