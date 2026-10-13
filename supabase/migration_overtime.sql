-- HRSuite migration: Overtime requests
-- Run in Supabase SQL Editor (after schema.sql / migration_360.sql).

create table if not exists overtime_requests (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  emp_name text,
  date date,
  start_time text,
  end_time text,
  hours numeric default 0,
  reason text,
  project text,
  status text default 'Pending',
  stage int default 0,
  history jsonb default '[]',
  doc text
);

alter table overtime_requests enable row level security;

do $$ begin
  create policy "demo-all" on overtime_requests for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
