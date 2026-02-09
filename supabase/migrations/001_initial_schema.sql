-- ============================================================================
-- Personal Coaching App: Initial Schema Migration
-- ============================================================================
-- Coach: Waheed
-- First client: Abdur Rahman
--
-- This migration creates the full database schema including:
--   - 8 tables (profiles, coach_clients, goals, quarterly_goals, weekly_goals,
--     checkins, google_tokens, goal_changes)
--   - Row Level Security policies on every table
--   - Auto-updating updated_at trigger
--   - Foreign key indexes for performance
-- ============================================================================


-- ============================================================================
-- EXTENSIONS
-- ============================================================================

-- pgcrypto is enabled by default in Supabase, but ensure it exists for
-- gen_random_uuid().
create extension if not exists "pgcrypto";


-- ============================================================================
-- UTILITY: updated_at TRIGGER FUNCTION
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- TABLE 1: profiles
-- ============================================================================
-- Extends Supabase auth.users. Every authenticated user gets a row here.
-- Role is either 'coach' or 'client'.

create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  full_name  text        not null,
  phone      text,
  role       text        not null check (role in ('coach', 'client')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'User profiles extending Supabase auth.users.';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();


-- ============================================================================
-- TABLE 2: coach_clients
-- ============================================================================
-- Links a coach to a client. A coach can have many clients.

create table public.coach_clients (
  id         uuid        primary key default gen_random_uuid(),
  coach_id   uuid        not null references public.profiles (id) on delete cascade,
  client_id  uuid        not null references public.profiles (id) on delete cascade,
  status     text        not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),

  unique (coach_id, client_id)
);

comment on table public.coach_clients is 'Many-to-many link between coaches and their clients.';

create index idx_coach_clients_coach_id  on public.coach_clients (coach_id);
create index idx_coach_clients_client_id on public.coach_clients (client_id);


-- ============================================================================
-- TABLE 3: goals (3-year goals)
-- ============================================================================
-- Long-term goals set per client across four life categories.

create table public.goals (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.profiles (id) on delete cascade,
  coach_id    uuid        not null references public.profiles (id) on delete cascade,
  title       text        not null,
  description text,
  category    text        not null check (category in ('professional', 'relationships', 'fitness', 'spirituality')),
  target_date date,
  status      text        not null default 'active' check (status in ('active', 'completed', 'paused')),
  progress    integer     not null default 0 check (progress >= 0 and progress <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.goals is 'Three-year goals for each client, organized by life category.';

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.handle_updated_at();

create index idx_goals_client_id on public.goals (client_id);
create index idx_goals_coach_id  on public.goals (coach_id);


-- ============================================================================
-- TABLE 4: quarterly_goals (90-day goals)
-- ============================================================================
-- Each quarterly goal rolls up to a parent 3-year goal.

create table public.quarterly_goals (
  id            uuid        primary key default gen_random_uuid(),
  goal_id       uuid        not null references public.goals (id) on delete cascade,
  client_id     uuid        not null references public.profiles (id) on delete cascade,
  title         text        not null,
  description   text,
  quarter_start date        not null,
  quarter_end   date        not null,
  status        text        not null default 'active' check (status in ('active', 'completed', 'paused')),
  progress      integer     not null default 0 check (progress >= 0 and progress <= 100),
  client_notes  text,
  coach_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.quarterly_goals is '90-day goals linked to a parent 3-year goal.';

create trigger quarterly_goals_updated_at
  before update on public.quarterly_goals
  for each row execute function public.handle_updated_at();

create index idx_quarterly_goals_goal_id   on public.quarterly_goals (goal_id);
create index idx_quarterly_goals_client_id on public.quarterly_goals (client_id);


-- ============================================================================
-- TABLE 5: weekly_goals
-- ============================================================================
-- Concrete weekly tasks that roll up to a quarterly goal.

create table public.weekly_goals (
  id                uuid        primary key default gen_random_uuid(),
  quarterly_goal_id uuid        not null references public.quarterly_goals (id) on delete cascade,
  client_id         uuid        not null references public.profiles (id) on delete cascade,
  title             text        not null,
  week_start        date        not null, -- Monday
  week_end          date        not null, -- Sunday
  status            text        not null default 'pending' check (status in ('pending', 'completed', 'missed', 'partial')),
  client_notes      text,
  coach_notes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.weekly_goals is 'Weekly tasks linked to a quarterly goal. week_start is Monday, week_end is Sunday.';

create trigger weekly_goals_updated_at
  before update on public.weekly_goals
  for each row execute function public.handle_updated_at();

create index idx_weekly_goals_quarterly_goal_id on public.weekly_goals (quarterly_goal_id);
create index idx_weekly_goals_client_id         on public.weekly_goals (client_id);


-- ============================================================================
-- TABLE 6: checkins
-- ============================================================================
-- Scheduled coaching check-in calls with optional Google Calendar link.

create table public.checkins (
  id              uuid        primary key default gen_random_uuid(),
  coach_id        uuid        not null references public.profiles (id) on delete cascade,
  client_id       uuid        not null references public.profiles (id) on delete cascade,
  scheduled_at    timestamptz not null,
  status          text        not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  coach_notes     text,
  google_event_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.checkins is 'Scheduled check-in calls between coach and client.';

create trigger checkins_updated_at
  before update on public.checkins
  for each row execute function public.handle_updated_at();

create index idx_checkins_coach_id  on public.checkins (coach_id);
create index idx_checkins_client_id on public.checkins (client_id);


-- ============================================================================
-- TABLE 7: google_tokens
-- ============================================================================
-- OAuth tokens for Google Calendar integration. Access is strictly
-- server-side via service role key; RLS blocks all client reads except owner.

create table public.google_tokens (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  access_token  text        not null,
  refresh_token text        not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id)
);

comment on table public.google_tokens is 'Google OAuth tokens. Server-side only; protected by strict RLS.';

create trigger google_tokens_updated_at
  before update on public.google_tokens
  for each row execute function public.handle_updated_at();

create index idx_google_tokens_user_id on public.google_tokens (user_id);


-- ============================================================================
-- TABLE 8: goal_changes (audit log)
-- ============================================================================
-- Immutable audit trail for every goal edit across all three goal levels.

create table public.goal_changes (
  id            uuid        primary key default gen_random_uuid(),
  goal_id       uuid,       -- references goals, quarterly_goals, or weekly_goals
  goal_type     text        not null check (goal_type in ('three_year', 'quarterly', 'weekly')),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  action        text        not null check (action in ('created', 'edited', 'status_updated')),
  field_changed text,       -- e.g. 'title', 'description', 'status'
  old_value     text,
  new_value     text,
  created_at    timestamptz not null default now()
);

comment on table public.goal_changes is 'Audit log for goal edits across three_year, quarterly, and weekly goal types.';

create index idx_goal_changes_goal_id  on public.goal_changes (goal_id);
create index idx_goal_changes_user_id  on public.goal_changes (user_id);


-- ============================================================================
-- ROW LEVEL SECURITY: ENABLE ON ALL TABLES
-- ============================================================================

alter table public.profiles        enable row level security;
alter table public.coach_clients   enable row level security;
alter table public.goals           enable row level security;
alter table public.quarterly_goals enable row level security;
alter table public.weekly_goals    enable row level security;
alter table public.checkins        enable row level security;
alter table public.google_tokens   enable row level security;
alter table public.goal_changes    enable row level security;


-- ============================================================================
-- RLS POLICIES: profiles
-- ============================================================================
-- Users can read their own profile.
-- Coaches can also read profiles of their linked clients.

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Coaches can read client profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.coach_clients cc
      where cc.coach_id = auth.uid()
        and cc.client_id = profiles.id
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is handled by a Supabase trigger / service role when a user signs up.
-- We allow users to insert their own profile row on signup.
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ============================================================================
-- RLS POLICIES: coach_clients
-- ============================================================================
-- Coaches can read and manage their own coach-client relationships.
-- Clients can read relationships where they are the client.

create policy "Coaches can read own relationships"
  on public.coach_clients for select
  using (auth.uid() = coach_id);

create policy "Clients can read own relationships"
  on public.coach_clients for select
  using (auth.uid() = client_id);

create policy "Coaches can insert relationships"
  on public.coach_clients for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can update own relationships"
  on public.coach_clients for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Coaches can delete own relationships"
  on public.coach_clients for delete
  using (auth.uid() = coach_id);


-- ============================================================================
-- RLS POLICIES: goals (3-year)
-- ============================================================================
-- Coaches can fully CRUD goals for their clients.
-- Clients can read their own goals and update status/notes/progress.

create policy "Coaches can read goals for their clients"
  on public.goals for select
  using (auth.uid() = coach_id);

create policy "Clients can read own goals"
  on public.goals for select
  using (auth.uid() = client_id);

create policy "Coaches can insert goals"
  on public.goals for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can update goals"
  on public.goals for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Clients can update own goals"
  on public.goals for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

create policy "Coaches can delete goals"
  on public.goals for delete
  using (auth.uid() = coach_id);


-- ============================================================================
-- RLS POLICIES: quarterly_goals
-- ============================================================================
-- Coaches can CRUD via the parent goal's coach_id.
-- Clients can read and update their own quarterly goals.

create policy "Coaches can read quarterly goals"
  on public.quarterly_goals for select
  using (
    exists (
      select 1 from public.goals g
      where g.id = quarterly_goals.goal_id
        and g.coach_id = auth.uid()
    )
  );

create policy "Clients can read own quarterly goals"
  on public.quarterly_goals for select
  using (auth.uid() = client_id);

create policy "Coaches can insert quarterly goals"
  on public.quarterly_goals for insert
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_id
        and g.coach_id = auth.uid()
    )
  );

create policy "Coaches can update quarterly goals"
  on public.quarterly_goals for update
  using (
    exists (
      select 1 from public.goals g
      where g.id = quarterly_goals.goal_id
        and g.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_id
        and g.coach_id = auth.uid()
    )
  );

create policy "Clients can update own quarterly goals"
  on public.quarterly_goals for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

create policy "Coaches can delete quarterly goals"
  on public.quarterly_goals for delete
  using (
    exists (
      select 1 from public.goals g
      where g.id = quarterly_goals.goal_id
        and g.coach_id = auth.uid()
    )
  );


-- ============================================================================
-- RLS POLICIES: weekly_goals
-- ============================================================================
-- Coaches can CRUD via the parent chain (weekly -> quarterly -> goal).
-- Clients can read and update their own weekly goals.

create policy "Coaches can read weekly goals"
  on public.weekly_goals for select
  using (
    exists (
      select 1 from public.quarterly_goals qg
      join public.goals g on g.id = qg.goal_id
      where qg.id = weekly_goals.quarterly_goal_id
        and g.coach_id = auth.uid()
    )
  );

create policy "Clients can read own weekly goals"
  on public.weekly_goals for select
  using (auth.uid() = client_id);

create policy "Coaches can insert weekly goals"
  on public.weekly_goals for insert
  with check (
    exists (
      select 1 from public.quarterly_goals qg
      join public.goals g on g.id = qg.goal_id
      where qg.id = quarterly_goal_id
        and g.coach_id = auth.uid()
    )
  );

create policy "Coaches can update weekly goals"
  on public.weekly_goals for update
  using (
    exists (
      select 1 from public.quarterly_goals qg
      join public.goals g on g.id = qg.goal_id
      where qg.id = weekly_goals.quarterly_goal_id
        and g.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quarterly_goals qg
      join public.goals g on g.id = qg.goal_id
      where qg.id = quarterly_goal_id
        and g.coach_id = auth.uid()
    )
  );

create policy "Clients can update own weekly goals"
  on public.weekly_goals for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

create policy "Coaches can delete weekly goals"
  on public.weekly_goals for delete
  using (
    exists (
      select 1 from public.quarterly_goals qg
      join public.goals g on g.id = qg.goal_id
      where qg.id = weekly_goals.quarterly_goal_id
        and g.coach_id = auth.uid()
    )
  );


-- ============================================================================
-- RLS POLICIES: checkins
-- ============================================================================
-- Both coach and client can read their own check-ins.
-- Only the coach can create, update, and delete check-ins.

create policy "Coaches can read own checkins"
  on public.checkins for select
  using (auth.uid() = coach_id);

create policy "Clients can read own checkins"
  on public.checkins for select
  using (auth.uid() = client_id);

create policy "Coaches can insert checkins"
  on public.checkins for insert
  with check (auth.uid() = coach_id);

create policy "Coaches can update checkins"
  on public.checkins for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

create policy "Coaches can delete checkins"
  on public.checkins for delete
  using (auth.uid() = coach_id);


-- ============================================================================
-- RLS POLICIES: google_tokens
-- ============================================================================
-- Only the owning user can read or manage their tokens.
-- In practice, tokens are accessed server-side via the service role key,
-- but this policy prevents any client-side leakage.

create policy "Users can read own tokens"
  on public.google_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens"
  on public.google_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tokens"
  on public.google_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own tokens"
  on public.google_tokens for delete
  using (auth.uid() = user_id);


-- ============================================================================
-- RLS POLICIES: goal_changes (audit log)
-- ============================================================================
-- Both coach and client can read audit entries for goals they have access to.
-- Both can insert new audit entries (the app writes these on goal mutations).
-- No one can update or delete audit entries (immutable log).

create policy "Coaches can read goal changes"
  on public.goal_changes for select
  using (
    -- Coach sees changes for any goal where they are the coach
    exists (
      select 1 from public.goals g
      where g.id = goal_changes.goal_id
        and g.coach_id = auth.uid()
    )
    or exists (
      select 1 from public.quarterly_goals qg
      where qg.id = goal_changes.goal_id
        and exists (
          select 1 from public.goals g
          where g.id = qg.goal_id and g.coach_id = auth.uid()
        )
    )
    or exists (
      select 1 from public.weekly_goals wg
      where wg.id = goal_changes.goal_id
        and exists (
          select 1 from public.quarterly_goals qg
          join public.goals g on g.id = qg.goal_id
          where qg.id = wg.quarterly_goal_id and g.coach_id = auth.uid()
        )
    )
  );

create policy "Clients can read goal changes"
  on public.goal_changes for select
  using (
    -- Client sees changes for any goal where they are the client
    exists (
      select 1 from public.goals g
      where g.id = goal_changes.goal_id
        and g.client_id = auth.uid()
    )
    or exists (
      select 1 from public.quarterly_goals qg
      where qg.id = goal_changes.goal_id
        and qg.client_id = auth.uid()
    )
    or exists (
      select 1 from public.weekly_goals wg
      where wg.id = goal_changes.goal_id
        and wg.client_id = auth.uid()
    )
  );

create policy "Coaches can insert goal changes"
  on public.goal_changes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'coach'
    )
  );

create policy "Clients can insert goal changes"
  on public.goal_changes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'client'
    )
  );


-- ============================================================================
-- DONE
-- ============================================================================
-- Migration complete. Summary:
--   - 8 tables created
--   - RLS enabled and policies defined on all 8 tables
--   - updated_at trigger applied to: profiles, goals, quarterly_goals,
--     weekly_goals, checkins, google_tokens
--   - Indexes on all foreign key columns
-- ============================================================================
