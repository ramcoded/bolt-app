-- ============================================================
-- 011_multi_team.sql
-- Multi-team support: users can belong to multiple teams,
-- managers can create multiple teams, members can leave teams.
-- ============================================================

-- 1. Add email to profiles for existing-account lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- 2. Create team_memberships junction table (many-to-many user ↔ team)
CREATE TABLE IF NOT EXISTS team_memberships (
  user_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id   uuid        NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
CREATE INDEX IF NOT EXISTS team_memberships_user_id_idx ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS team_memberships_team_id_idx ON team_memberships(team_id);

ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

-- Users can read their own memberships
CREATE POLICY "team_memberships_select_own" ON team_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Managers can read memberships for teams they own
CREATE POLICY "team_memberships_select_manager" ON team_memberships
  FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT id FROM teams WHERE created_by = auth.uid())
  );

-- Users can add themselves to a team (used when accepting invitations)
CREATE POLICY "team_memberships_insert_self" ON team_memberships
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can leave their own teams
CREATE POLICY "team_memberships_delete_own" ON team_memberships
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 3. Seed team_memberships from existing profiles.team_id data
INSERT INTO team_memberships (user_id, team_id)
SELECT id, team_id FROM profiles WHERE team_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Update team_messages RLS to support multi-team membership
DROP POLICY IF EXISTS "team_messages_select" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;

CREATE POLICY "team_messages_select" ON public.team_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid() AND team_id = team_messages.team_id
    )
  );

CREATE POLICY "team_messages_insert" ON public.team_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_memberships
      WHERE user_id = auth.uid() AND team_id = team_messages.team_id
    )
  );
