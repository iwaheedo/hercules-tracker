-- ============================================================================
-- Coach Approval System
-- ============================================================================
-- Adds an approval workflow for new coach signups.
-- Clients are auto-approved. Coaches need approval from the super-admin
-- (waheed@empasco.com). The super-admin is auto-approved.

-- 1. Add approved column (default true so all existing users are unaffected)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

-- 2. Add email column (needed to display coach emails in admin panel)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 3. Backfill emails from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. Update the handle_new_user trigger to set approved based on role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_role text;
  is_approved boolean;
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

  -- If this user was invited by a coach, auto-create the coach-client link
  IF new.raw_user_meta_data ->> 'invite_coach_id' IS NOT NULL THEN
    INSERT INTO public.coach_clients (coach_id, client_id)
    VALUES (
      (new.raw_user_meta_data ->> 'invite_coach_id')::uuid,
      new.id
    )
    ON CONFLICT (coach_id, client_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- 5. RLS: allow super-admin to read all coach profiles
CREATE POLICY "Superuser can read all coach profiles"
  ON public.profiles FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'waheed@empasco.com'
    AND role = 'coach'
  );

-- 6. RLS: allow super-admin to update coach profiles (for approval)
CREATE POLICY "Superuser can approve coaches"
  ON public.profiles FOR UPDATE
  USING (
    (auth.jwt() ->> 'email') = 'waheed@empasco.com'
    AND role = 'coach'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'waheed@empasco.com'
    AND role = 'coach'
  );
