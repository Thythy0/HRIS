-- Phase 4 — Experience: HR requests, announcements, loans, expenses
-- Run in Supabase SQL Editor. Idempotent.

create table if not exists hr_requests (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete set null,
  emp_name text,
  type text not null,
  details text,
  status text default 'Pending',
  stage int default 0,
  history jsonb default '[]',
  created date
);

create table if not exists announcements (
  id bigint generated always as identity primary key,
  title text not null,
  body text,
  audience text default 'All',
  dept bigint references departments(id),
  published date,
  expires date,
  "by" text
);

create table if not exists loans (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete set null,
  emp_name text,
  type text default 'Loan',
  amount numeric default 0,
  installments numeric default 1,
  deducted_per_pay numeric default 0,
  remaining numeric default 0,
  paid numeric default 0,
  start_date date,
  status text default 'Pending',
  stage int default 0,
  history jsonb default '[]',
  reason text
);

create table if not exists expenses (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete set null,
  emp_name text,
  category text,
  amount numeric default 0,
  date date,
  receipt text,
  description text,
  status text default 'Pending',
  stage int default 0,
  history jsonb default '[]'
);

alter table hr_requests enable row level security;
alter table announcements enable row level security;
alter table loans enable row level security;
alter table expenses enable row level security;

do $$ begin create policy "demo-all" on hr_requests for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on announcements for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on loans for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on expenses for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
