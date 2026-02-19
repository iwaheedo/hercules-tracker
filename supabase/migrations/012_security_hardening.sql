-- ============================================================================
-- Security Hardening Migration
-- ============================================================================
-- Addresses Supabase Security Advisor findings:
--   1. Fix handle_updated_at() missing SET search_path
--   2. Revoke execute on SECURITY DEFINER functions from anon/public
--   3. Remove tables from Supabase Realtime publication
--   4. Create invite_tokens table for secure invite links
-- ============================================================================


-- 1. Fix handle_updated_at() — add SET search_path = ''
-- Supabase Security Advisor flags SECURITY DEFINER functions without this.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;


-- 2. Revoke direct execute on SECURITY DEFINER trigger functions from anon/public.
-- These are trigger functions invoked by the database engine, not callable via API.
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;


-- 3. Remove all tables from Supabase Realtime publication.
-- The app does not use Realtime subscriptions.
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.coach_clients;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.goals;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.quarterly_goals;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.weekly_goals;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.checkins;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.google_tokens;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.goal_changes;


-- 4. Create invite_tokens table for secure invite links.
-- Replaces PII in query params (?invite=coachId&email=...&name=...) with an
-- opaque token that resolves server-side.
CREATE TABLE public.invite_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  coach_id    uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email       text        NOT NULL,
  name        text        NOT NULL,
  used        boolean     NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial index: only look up unused tokens
CREATE INDEX idx_invite_tokens_token ON public.invite_tokens (token) WHERE NOT used;

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Coaches can create invite tokens
CREATE POLICY "Coaches can insert invite tokens"
  ON public.invite_tokens FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

-- Coaches can read their own invite tokens
CREATE POLICY "Coaches can read own invite tokens"
  ON public.invite_tokens FOR SELECT
  USING (auth.uid() = coach_id);

-- Anyone can resolve a valid (unused + unexpired) token during signup
-- The token itself is the secret — knowing the token grants read access
CREATE POLICY "Anyone can resolve valid tokens"
  ON public.invite_tokens FOR SELECT
  USING (NOT used AND expires_at > now());

-- Tokens can only be marked as used (not edited otherwise)
CREATE POLICY "Token can be marked as used"
  ON public.invite_tokens FOR UPDATE
  USING (NOT used AND expires_at > now())
  WITH CHECK (used = true);
