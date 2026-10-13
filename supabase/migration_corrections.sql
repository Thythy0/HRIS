-- HRSuite migration: Attendance correction requests
-- Run in Supabase SQL Editor (after schema.sql / migration_360.sql / migration_overtime.sql).

create table if not exists correction_requests (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  emp_name text,
  date date,
  field text,
  original_time text,
  requested_time text,
  reason text,
  status text default 'Pending',
  stage int default 0,
  history jsonb default '[]',
  doc text
);

alter table correction_requests enable row level security;

do $$ begin
  create policy "demo-all" on correction_requests for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
