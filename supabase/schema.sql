-- HRSuite Supabase schema (Postgres)
-- Run in Supabase SQL Editor. Idempotent. Demo RLS policies (lock down for prod).

-- departments
create table if not exists departments (
  id bigint generated always as identity primary key,
  name text not null
);
-- positions
create table if not exists positions (
  id bigint generated always as identity primary key,
  name text not null,
  dept bigint references departments(id)
);
-- schedules
create table if not exists schedules (
  id bigint generated always as identity primary key,
  name text not null,
  days text,
  time_from text,
  time_to text,
  break_time text,
  schedule_type text,
  rest_day text
);
-- holidays
create table if not exists holidays (
  id bigint generated always as identity primary key,
  name text not null,
  date date,
  type text
);
-- leave types
create table if not exists leave_types (
  id bigint generated always as identity primary key,
  name text not null,
  credits numeric default 0
);
-- app users (profile only — passwords live in Supabase Auth, linked via auth_uid)
create table if not exists users (
  id bigint generated always as identity primary key,
  name text not null,
  email text unique not null,
  role text not null,
  auth_uid uuid unique references auth.users(id),
  emp_id bigint
);
-- employees
create table if not exists employees (
  id bigint generated always as identity primary key,
  code text unique,
  name text not null,
  dob date,
  address text,
  contact text,
  email text,
  dept bigint references departments(id),
  position bigint references positions(id),
  type text,
  status text default 'Active',
  hired date,
  salary_type text,
  salary numeric default 0,
  schedule bigint references schedules(id),
  allowances numeric default 0,
  bank text
);
-- attendance
create table if not exists attendance (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  date date not null,
  time_in text,
  time_out text,
  hours numeric default 0,
  late numeric default 0,
  overtime numeric default 0,
  status text,
  unique (emp_id, date)
);
-- leave requests
create table if not exists leave_requests (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  type_id bigint references leave_types(id),
  start date,
  "end" date,
  days numeric default 1,
  reason text,
  status text default 'Pending',
  doc text
);
-- payroll periods
create table if not exists payroll_periods (
  id bigint generated always as identity primary key,
  label text,
  date_from date,
  date_to date,
  status text default 'Draft'
);
-- payroll records
create table if not exists payroll_records (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  period_id bigint references payroll_periods(id) on delete cascade,
  days_worked numeric default 0,
  overtime_hrs numeric default 0,
  basic numeric default 0,
  overtime numeric default 0,
  holiday numeric default 0,
  night_diff numeric default 0,
  allowances numeric default 0,
  bonus numeric default 0,
  gross numeric default 0,
  sss numeric default 0,
  philhealth numeric default 0,
  pagibig numeric default 0,
  tax numeric default 0,
  loans numeric default 0,
  absences numeric default 0,
  lates numeric default 0,
  total_ded numeric default 0,
  net numeric default 0,
  status text default 'Draft',
  unique (emp_id, period_id)
);
-- notifications
create table if not exists notifications (
  id bigint generated always as identity primary key,
  text text,
  time text,
  unread boolean default true
);
-- activity
create table if not exists activity (
  id bigint generated always as identity primary key,
  text text,
  time text,
  type text
);
-- company (single row, id=1)
create table if not exists company (
  id bigint primary key,
  name text,
  logo text,
  address text,
  contact text,
  email text,
  payroll_frequency text,
  payroll_dates text,
  grace_period numeric default 10,
  late_rule text,
  undertime_rule text,
  overtime_rule text,
  deduction_rules jsonb default '[]',
  workflows jsonb default '[]'
);

-- users.emp_id -> employees(id) (added after employees exists)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_emp_id_fkey') then
    alter table users add constraint users_emp_id_fkey foreign key (emp_id) references employees(id);
  end if;
end $$;

-- RLS is enabled below, but policies are granted by migration_security.sql
-- (role-based, mirroring src/lib/permissions.ts). Until that migration runs,
-- the database is intentionally fail-closed: signed-in users can read
-- nothing and write nothing. Never re-add permissive "demo-all" policies.
alter table departments enable row level security;
alter table positions enable row level security;
alter table schedules enable row level security;
alter table holidays enable row level security;
alter table leave_types enable row level security;
alter table users enable row level security;
alter table employees enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table payroll_periods enable row level security;
alter table payroll_records enable row level security;
alter table notifications enable row level security;
alter table activity enable row level security;
alter table company enable row level security;

-- (policies are created by migration_security.sql — see note above)
