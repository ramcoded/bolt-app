-- ============================================================
-- 005_team_isolation.sql
-- Enforce strict team isolation across profiles, tasks, and
-- time records. Uses a SECURITY DEFINER helper to avoid
-- infinite recursion in the profiles RLS policy.
-- ============================================================

-- Helper: returns the calling user's team_id without triggering
-- the profiles RLS policy (SECURITY DEFINER bypasses RLS).
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- profiles: scope SELECT to same team
-- ============================================================
DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()                                          -- always see own profile
    OR team_id IS NOT DISTINCT FROM get_my_team_id()        -- or same team (NULL-safe)
  );

-- ============================================================
-- tasks: scope to team members
-- ============================================================
DROP POLICY IF EXISTS "tasks_manager_all" ON tasks;
DROP POLICY IF EXISTS "tasks_employee_select" ON tasks;
DROP POLICY IF EXISTS "tasks_employee_update" ON tasks;

-- Managers can manage tasks for members of their team only
CREATE POLICY "tasks_manager_all" ON tasks
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    AND (
      assigned_to IS NULL
      OR assigned_to IN (
        SELECT id FROM profiles WHERE team_id = get_my_team_id()
      )
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    AND (
      assigned_to IS NULL
      OR assigned_to IN (
        SELECT id FROM profiles WHERE team_id = get_my_team_id()
      )
    )
  );

-- Employees still only see tasks assigned to them
CREATE POLICY "tasks_employee_select" ON tasks
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

-- Employees can update only their own tasks
CREATE POLICY "tasks_employee_update" ON tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- ============================================================
-- time_records: managers only see their team's records
-- ============================================================
DROP POLICY IF EXISTS "time_records_manager_select" ON time_records;

CREATE POLICY "time_records_manager_select" ON time_records
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'manager'
    AND user_id IN (
      SELECT id FROM profiles WHERE team_id = get_my_team_id()
    )
  );
