-- ============================================================
-- ROLLBACK MIGRATION — DESTROYS ALL DATA
-- WARNING: Only use this in development to reset the schema.
-- NEVER run in production without a full database backup.
-- ============================================================

-- Drop tables in reverse dependency order (children before parents)
DROP TABLE IF EXISTS public.schedule_overrides CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.team_messages CASCADE;
DROP TABLE IF EXISTS public.user_notes CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.calendar_notes CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.time_records CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Drop custom types if any were created
-- (none in current migrations — placeholder for future types)

-- ============================================================
-- After running this, re-apply migrations in order:
--   001_initial_schema.sql
--   002_rls_policies.sql
--   003_indexes_rls_fixes.sql
--   004_...
--   etc.
-- ============================================================
