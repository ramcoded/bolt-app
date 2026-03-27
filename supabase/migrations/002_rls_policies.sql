-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================
-- All authenticated users can read profiles (needed for team listing)
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- tasks
-- ============================================================
-- Managers can do everything
CREATE POLICY "tasks_manager_all" ON tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  );

-- Employees can only read tasks assigned to them
CREATE POLICY "tasks_employee_select" ON tasks
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());

-- Employees can only update tasks assigned to them
CREATE POLICY "tasks_employee_update" ON tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- ============================================================
-- messages
-- ============================================================
-- Users can only read messages where they are sender or receiver
CREATE POLICY "messages_select" ON messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can only insert messages where they are the sender
CREATE POLICY "messages_insert" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- notifications
-- ============================================================
-- Users can only read their own notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can only update their own notifications
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow inserts for task assignment notifications (any authenticated user)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- time_records
-- ============================================================
-- Users can read/insert/update their own records
CREATE POLICY "time_records_own" ON time_records
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Managers can read all time records
CREATE POLICY "time_records_manager_select" ON time_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  );

-- ============================================================
-- calendar_notes
-- ============================================================
-- Users can only read their own notes
CREATE POLICY "calendar_notes_select" ON calendar_notes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can only insert their own notes
CREATE POLICY "calendar_notes_insert" ON calendar_notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can only update their own notes
CREATE POLICY "calendar_notes_update" ON calendar_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
