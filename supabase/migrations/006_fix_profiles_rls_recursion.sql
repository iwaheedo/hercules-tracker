-- ============================================================================
-- Fix: infinite recursion in profiles RLS
-- ============================================================================
-- Migration 005 added a policy "Coaches can read all client profiles" that
-- queries the profiles table FROM WITHIN a profiles policy → infinite recursion.
-- Fix: drop that policy and create a new one using auth.jwt() to check role
-- from the JWT token (no table self-reference).

-- 1. Drop the broken policy
drop policy if exists "Coaches can read all client profiles" on public.profiles;

-- 2. Create a non-recursive replacement
--    Uses auth.jwt() -> 'user_metadata' ->> 'role' to check if the viewer
--    is a coach, without querying the profiles table.
create policy "Coaches can read all client profiles"
  on public.profiles for select
  using (
    -- The viewer is a coach (checked via JWT, no table query)
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
    -- And the row being viewed is a client
    and role = 'client'
  );

-- 3. Reactivate FA's coach_clients relationship
--    It was set to 'inactive' during earlier testing of "Remove client"
update public.coach_clients
  set status = 'active'
  where client_id = '821dc0d5-b7d2-4a41-9706-32201e049189'
    and status = 'inactive';
