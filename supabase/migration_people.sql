-- Phase 5 — Performance, goals, training
-- Run in Supabase SQL Editor. Idempotent.

create table if not exists goals (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  title text not null,
  kpi text,
  target text,
  due date,
  weight numeric default 1,
  progress numeric default 0,
  status text default 'Not Started'
);

create table if not exists reviews (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  cycle text,
  type text,
  rating numeric default 0,
  comments text,
  status text default 'Not Started',
  reviewer text,
  history jsonb default '[]'
);

create table if not exists skills (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  skill text not null,
  level text,
  certified boolean default false
);

create table if not exists trainings (
  id bigint generated always as identity primary key,
  title text not null,
  trainer text,
  dates text,
  participants jsonb default '[]',
  status text default 'Planned'
);

create table if not exists training_records (
  id bigint generated always as identity primary key,
  program_id bigint references trainings(id) on delete cascade,
  emp_id bigint references employees(id) on delete cascade,
  attended boolean default false,
  certificate text,
  date date
);

alter table goals enable row level security;
alter table reviews enable row level security;
alter table skills enable row level security;
alter table trainings enable row level security;
alter table training_records enable row level security;

do $$ begin create policy "demo-all" on goals for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on reviews for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on skills for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on trainings for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on training_records for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
