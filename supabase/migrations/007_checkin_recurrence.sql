-- ============================================================================
-- Check-in Enhancements: Recurring Weekly + iCalendar Support
-- ============================================================================

-- 1. Add recurrence support to checkins table
ALTER TABLE public.checkins
  ADD COLUMN recurrence_group uuid,
  ADD COLUMN duration_minutes integer NOT NULL DEFAULT 30;

CREATE INDEX idx_checkins_recurrence_group ON public.checkins (recurrence_group)
  WHERE recurrence_group IS NOT NULL;

COMMENT ON COLUMN public.checkins.recurrence_group IS
  'UUID linking all check-ins in a recurring weekly series. NULL for one-off check-ins.';
COMMENT ON COLUMN public.checkins.duration_minutes IS
  'Duration in minutes for calendar events. Default 30.';

-- 2. Add email column to profiles (needed for .ics attendee fields)
ALTER TABLE public.profiles ADD COLUMN email text;

CREATE INDEX idx_profiles_email ON public.profiles (email)
  WHERE email IS NOT NULL;

-- 3. Update the auto-create-profile trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unknown'),
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    new.email
  );
  RETURN new;
END;
$$;

-- 4. Backfill existing profiles with email from auth.users
UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.id = u.id
    AND p.email IS NULL;
