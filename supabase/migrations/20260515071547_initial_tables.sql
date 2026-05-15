-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  morning_briefing_time time default '08:00:00',
  evening_checkin_time time default '21:00:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- GOALS TABLE
-- ============================================
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text check (category in ('health', 'career', 'learning', 'finance', 'relationships', 'personal', 'other')) default 'personal',
  status text check (status in ('active', 'paused', 'completed', 'archived')) default 'active',
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  target_date date,
  progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
  ai_breakdown jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MILESTONES TABLE
-- ============================================
create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references public.goals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  due_date date,
  status text check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  order_index integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TASKS TABLE (Daily micro-tasks)
-- ============================================
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  milestone_id uuid references public.milestones(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  scheduled_date date default current_date,
  scheduled_time time,
  duration_minutes integer default 30,
  status text check (status in ('pending', 'in_progress', 'completed', 'skipped')) default 'pending',
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  is_ai_generated boolean default false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- HABITS TABLE
-- ============================================
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  frequency text check (frequency in ('daily', 'weekly', 'weekdays', 'weekends')) default 'daily',
  target_count integer default 1,
  category text default 'health',
  color text default '#6366f1',
  icon text default '⭐',
  is_active boolean default true,
  streak_count integer default 0,
  longest_streak integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- HABIT LOGS TABLE
-- ============================================
create table public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  logged_date date default current_date,
  count integer default 1,
  notes text,
  created_at timestamptz default now(),
  unique(habit_id, logged_date)
);

-- ============================================
-- JOURNAL ENTRIES TABLE
-- ============================================
create table public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  content text not null,
  mood text check (mood in ('great', 'good', 'okay', 'bad', 'terrible')),
  energy_level integer check (energy_level >= 1 and energy_level <= 10),
  ai_insights text,
  tags text[],
  entry_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- AGENT MEMORY TABLE (AI learns patterns)
-- ============================================
create table public.agent_memory (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  memory_type text check (memory_type in ('pattern', 'preference', 'insight', 'context')) not null,
  key text not null,
  value text not null,
  confidence_score float default 0.5,
  last_reinforced timestamptz default now(),
  created_at timestamptz default now()
);

-- ============================================
-- REPORTS TABLE (Weekly executive summaries)
-- ============================================
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  report_type text check (report_type in ('daily', 'weekly', 'monthly')) default 'weekly',
  title text not null,
  content text not null,
  metrics jsonb,
  week_start date,
  week_end date,
  created_at timestamptz default now()
);

-- ============================================
-- BRIEFINGS TABLE (Morning briefings history)
-- ============================================
create table public.briefings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  briefing_date date default current_date,
  tasks_suggested jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.journal_entries enable row level security;
alter table public.agent_memory enable row level security;
alter table public.reports enable row level security;
alter table public.briefings enable row level security;

-- RLS Policies (users only see their own data)
create policy "Users can view own profile" on public.profiles for all using (auth.uid() = id);
create policy "Users can manage own goals" on public.goals for all using (auth.uid() = user_id);
create policy "Users can manage own milestones" on public.milestones for all using (auth.uid() = user_id);
create policy "Users can manage own tasks" on public.tasks for all using (auth.uid() = user_id);
create policy "Users can manage own habits" on public.habits for all using (auth.uid() = user_id);
create policy "Users can manage own habit_logs" on public.habit_logs for all using (auth.uid() = user_id);
create policy "Users can manage own journal" on public.journal_entries for all using (auth.uid() = user_id);
create policy "Users can manage own agent_memory" on public.agent_memory for all using (auth.uid() = user_id);
create policy "Users can manage own reports" on public.reports for all using (auth.uid() = user_id);
create policy "Users can manage own briefings" on public.briefings for all using (auth.uid() = user_id);

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- UPDATE TIMESTAMP FUNCTION
-- ============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_goals_updated_at before update on public.goals
  for each row execute function update_updated_at_column();

create trigger update_tasks_updated_at before update on public.tasks
  for each row execute function update_updated_at_column();

create trigger update_milestones_updated_at before update on public.milestones
  for each row execute function update_updated_at_column();