-- ============================================================================
-- Add engagement_start to coach_clients + purpose_text to profiles
-- ============================================================================

-- Track when the coaching engagement started per client
ALTER TABLE public.coach_clients ADD COLUMN engagement_start DATE;

-- Backfill Abdur Rahman's engagement start date (16 Feb 2026)
UPDATE public.coach_clients
SET engagement_start = '2026-02-16'
WHERE client_id = (
  SELECT id FROM public.profiles
  WHERE full_name ILIKE '%abdur rahman%'
  LIMIT 1
);

-- Free-text field for client's "Purpose & Why"
ALTER TABLE public.profiles ADD COLUMN purpose_text TEXT;
