-- ─────────────────────────────────────────────
-- 06_startup_status.sql
-- Adds a status column to startup_profiles so
-- startups must be admin-approved before they
-- can view the intern listings.
-- ─────────────────────────────────────────────

ALTER TABLE public.startup_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));
