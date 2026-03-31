-- ============================================================
-- 008_user_notes.sql
-- Personal scratchpad notes, one row per user (upsert on user_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  content    TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notes_select" ON public.user_notes;
DROP POLICY IF EXISTS "user_notes_insert" ON public.user_notes;
DROP POLICY IF EXISTS "user_notes_update" ON public.user_notes;

CREATE POLICY "user_notes_select" ON public.user_notes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_notes_insert" ON public.user_notes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_notes_update" ON public.user_notes
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
