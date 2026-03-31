-- ============================================================
-- 006_leave_requests.sql  (idempotent re-run safe)
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$;

-- ── leave_requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID        REFERENCES public.teams(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL CHECK (type IN ('overtime', 'pre_shift_overtime', 'leave')),
  date          DATE        NOT NULL,
  time_start    TEXT,
  time_end      TEXT,
  hours         NUMERIC(4,1),
  reason        TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'granted', 'rejected')),
  reviewer_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_own_select"    ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_own_insert"    ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_manager_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_manager_update" ON public.leave_requests;

CREATE POLICY "leave_requests_own_select" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "leave_requests_own_insert" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "leave_requests_manager_select" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager'
    AND team_id IS NOT DISTINCT FROM get_my_team_id()
  );

CREATE POLICY "leave_requests_manager_update" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager'
    AND team_id IS NOT DISTINCT FROM get_my_team_id()
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager'
    AND team_id IS NOT DISTINCT FROM get_my_team_id()
  );

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id     ON public.leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_team_status ON public.leave_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_date        ON public.leave_requests(date);

-- ── schedule_overrides ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schedule_overrides (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('overtime', 'pre_shift_overtime', 'leave')),
  time_in     TEXT,
  time_out    TEXT,
  request_id  UUID        REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.schedule_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_overrides_own_select"     ON public.schedule_overrides;
DROP POLICY IF EXISTS "schedule_overrides_manager_select" ON public.schedule_overrides;

CREATE POLICY "schedule_overrides_own_select" ON public.schedule_overrides
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "schedule_overrides_manager_select" ON public.schedule_overrides
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'manager'
    AND user_id IN (
      SELECT id FROM public.profiles WHERE team_id = get_my_team_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_schedule_overrides_user_date ON public.schedule_overrides(user_id, date);
