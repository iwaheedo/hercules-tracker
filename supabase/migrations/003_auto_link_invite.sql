-- ============================================================================
-- Fix: Auto-link coach-client relationship on invite signup
-- ============================================================================
-- When a client signs up via an invite link, the invite_coach_id is stored
-- in auth.users.raw_user_meta_data. This updated trigger creates the
-- coach_clients row automatically using SECURITY DEFINER to bypass RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 1. Create the user's profile
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unknown'),
    coalesce(new.raw_user_meta_data ->> 'role', 'client')
  );

  -- 2. If this user was invited by a coach, auto-create the coach-client link
  if new.raw_user_meta_data ->> 'invite_coach_id' is not null then
    insert into public.coach_clients (coach_id, client_id)
    values (
      (new.raw_user_meta_data ->> 'invite_coach_id')::uuid,
      new.id
    )
    on conflict (coach_id, client_id) do nothing;
  end if;

  return new;
end;
$$;
