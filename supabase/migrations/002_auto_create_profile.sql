-- ============================================================================
-- Fix: Auto-create profile on signup via database trigger
-- ============================================================================
-- This runs as SECURITY DEFINER (bypasses RLS) so it can insert the profile
-- row immediately when a user signs up via Supabase Auth.
-- The user's full_name and role are passed via auth.users.raw_user_meta_data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unknown'),
    coalesce(new.raw_user_meta_data ->> 'role', 'client')
  );
  return new;
end;
$$;

-- Trigger: fires after a new row is inserted into auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
