-- ============================================================================
-- Add daily_status JSONB column to weekly_goals for day-by-day tracking
-- ============================================================================
-- Stores per-day completion status, e.g.:
-- {"mon": true, "tue": true, "wed": false, "thu": null, "fri": null, "sat": null, "sun": null}
-- true = completed, false = missed, null/absent = not yet tracked

ALTER TABLE public.weekly_goals ADD COLUMN daily_status JSONB DEFAULT '{}';
