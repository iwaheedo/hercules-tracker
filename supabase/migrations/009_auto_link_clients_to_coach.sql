-- ============================================================================
-- Auto-link all new clients to an approved coach
-- ============================================================================
-- Problem: Clients who self-sign up (without an invite link) are "orphaned" —
-- they have a profile but no coach_clients row, so no coach can see them.
--
-- Fix: When a new client signs up, the trigger now auto-links them to the
-- first approved coach. For a single-coach setup this means all clients
-- automatically appear on the coach dashboard.
--
-- Also includes a one-off backfill to link any existing orphaned clients.

-- 1. Update the handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role text;
  is_approved boolean;
  v_coach_id uuid;
BEGIN
  user_role := coalesce(new.raw_user_meta_data ->> 'role', 'client');

  -- Clients are auto-approved; coaches need approval
  -- Exception: the super-admin coach is auto-approved
  IF user_role = 'client' THEN
    is_approved := true;
  ELSIF new.email = 'waheed@empasco.com' THEN
    is_approved := true;
  ELSE
    is_approved := false;
  END IF;

  -- Create the user's profile
  INSERT INTO public.profiles (id, full_name, role, email, approved)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unknown'),
    user_role,
    new.email,
    is_approved
  );

  -- Auto-link client to a coach
  IF user_role = 'client' THEN
    -- If invited by a specific coach, link to that coach
    IF new.raw_user_meta_data ->> 'invite_coach_id' IS NOT NULL THEN
      v_coach_id := (new.raw_user_meta_data ->> 'invite_coach_id')::uuid;
    ELSE
      -- Otherwise, link to the first approved coach (for single-coach setup)
      SELECT id INTO v_coach_id
      FROM public.profiles
      WHERE role = 'coach' AND approved = true
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    IF v_coach_id IS NOT NULL THEN
      INSERT INTO public.coach_clients (coach_id, client_id)
      VALUES (v_coach_id, new.id)
      ON CONFLICT (coach_id, client_id) DO NOTHING;
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- 2. Backfill: link any existing orphaned clients to the first approved coach
-- (clients who have a profile but no coach_clients row)
DO $$
DECLARE
  v_coach_id uuid;
BEGIN
  -- Find the first approved coach
  SELECT id INTO v_coach_id
  FROM public.profiles
  WHERE role = 'coach' AND approved = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_coach_id IS NOT NULL THEN
    INSERT INTO public.coach_clients (coach_id, client_id)
    SELECT v_coach_id, p.id
    FROM public.profiles p
    WHERE p.role = 'client'
      AND NOT EXISTS (
        SELECT 1 FROM public.coach_clients cc
        WHERE cc.client_id = p.id
      )
    ON CONFLICT (coach_id, client_id) DO NOTHING;
  END IF;
END;
$$;
