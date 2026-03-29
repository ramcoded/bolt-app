-- ============================================================
-- 004_teams.sql
-- Adds multi-team support: each manager who signs up via Google
-- gets their own team. Invited members inherit the team of the
-- manager who invited them.
-- ============================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL DEFAULT 'My Team',
  created_by uuid,   -- uuid of the profile that created the team (no FK to avoid circular dep)
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add team_id to profiles (nullable for backwards compat)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;

-- Index for fast team-member lookups
CREATE INDEX IF NOT EXISTS profiles_team_id_idx ON profiles(team_id);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Team members can read their own team
CREATE POLICY "teams_select" ON teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.team_id = teams.id
    )
  );

-- Managers in the team can update the team name
CREATE POLICY "teams_update" ON teams
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.team_id = teams.id
        AND profiles.role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.team_id = teams.id
        AND profiles.role = 'manager'
    )
  );

-- ============================================================
-- Migrate existing data: put all current profiles into one
-- default team so the app keeps working after this migration.
-- ============================================================
DO $$
DECLARE
  default_team_id uuid;
BEGIN
  -- Only run if there are profiles without a team
  IF EXISTS (SELECT 1 FROM profiles WHERE team_id IS NULL LIMIT 1) THEN
    INSERT INTO teams (name, created_by)
    VALUES ('My Team', (SELECT id FROM profiles WHERE role = 'manager' LIMIT 1))
    RETURNING id INTO default_team_id;

    UPDATE profiles SET team_id = default_team_id WHERE team_id IS NULL;
  END IF;
END $$;
