-- ============================================================================
-- Allow coaches to read client profiles (for linking/inviting)
-- ============================================================================
-- Problem: coaches can only see profiles of already-linked clients.
-- When trying to link a new client by name, the query returns empty.
-- Fix: allow any coach to read any client profile.
-- Uses auth.jwt() to check role from JWT token (avoids infinite recursion).

create policy "Coaches can read all client profiles"
  on public.profiles for select
  using (
    -- The viewer is a coach (checked via JWT, no table self-reference)
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
    -- And the row being viewed is a client
    and role = 'client'
  );
