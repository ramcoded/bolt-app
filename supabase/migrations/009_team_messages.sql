CREATE TABLE IF NOT EXISTS public.team_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

-- Members can read their team's messages
CREATE POLICY "team_messages_select" ON public.team_messages
  FOR SELECT TO authenticated
  USING (team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()));

-- Members can insert their own messages to their team
CREATE POLICY "team_messages_insert" ON public.team_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_team_messages_team_created ON public.team_messages(team_id, created_at DESC);
