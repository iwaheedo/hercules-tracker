-- ============================================================================
-- Allow clients to create, edit, and delete their own goals
-- ============================================================================

-- Goals (3-year): Allow clients to insert goals for themselves
create policy "Clients can insert own goals"
  on public.goals for insert
  with check (auth.uid() = client_id);

-- Goals (3-year): Allow clients to delete their own goals
create policy "Clients can delete own goals"
  on public.goals for delete
  using (auth.uid() = client_id);

-- Quarterly goals: Allow clients to insert their own quarterly goals
create policy "Clients can insert own quarterly goals"
  on public.quarterly_goals for insert
  with check (auth.uid() = client_id);

-- Quarterly goals: Allow clients to delete their own quarterly goals
create policy "Clients can delete own quarterly goals"
  on public.quarterly_goals for delete
  using (auth.uid() = client_id);

-- Weekly goals: Allow clients to insert their own weekly goals
create policy "Clients can insert own weekly goals"
  on public.weekly_goals for insert
  with check (auth.uid() = client_id);

-- Weekly goals: Allow clients to delete their own weekly goals
create policy "Clients can delete own weekly goals"
  on public.weekly_goals for delete
  using (auth.uid() = client_id);
