-- HRSuite migration: Employee 360° profile + audit logs
-- Run AFTER supabase/schema.sql in Supabase SQL Editor.

-- New employee columns (360° profile)
alter table employees add column if not exists gender text;
alter table employees add column if not exists civil_status text;
alter table employees add column if not exists nationality text default 'Filipino';
alter table employees add column if not exists personal_email text;
alter table employees add column if not exists personal_mobile text;
alter table employees add column if not exists emergency_name text;
alter table employees add column if not exists emergency_relation text;
alter table employees add column if not exists emergency_phone text;
alter table employees add column if not exists regularization_date date;
alter table employees add column if not exists supervisor bigint references employees(id);
alter table employees add column if not exists work_location text;
alter table employees add column if not exists resignation_date date;
alter table employees add column if not exists termination_date date;
alter table employees add column if not exists pay_frequency text;
alter table employees add column if not exists benefits text;
alter table employees add column if not exists sss text;
alter table employees add column if not exists philhealth text;
alter table employees add column if not exists pagibig text;
alter table employees add column if not exists tin text;
alter table employees add column if not exists bank_account text;
alter table employees add column if not exists bank_account_name text;
alter table employees add column if not exists payment_method text;

-- Employee documents
create table if not exists employee_documents (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  name text not null,
  category text,
  file text,
  expiry date,
  status text default 'Active'
);

-- Salary history (append-only)
create table if not exists salary_history (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  date date,
  old_salary numeric,
  new_salary numeric,
  reason text,
  changed_by text
);

-- Employment status history (append-only)
create table if not exists employment_history (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete cascade,
  date date,
  old_status text,
  new_status text,
  reason text,
  changed_by text
);

-- Leave workflow stage tracking (engine: Supervisor → HR)
alter table leave_requests add column if not exists stage int default 0;
alter table leave_requests add column if not exists history jsonb default '[]';
alter table company add column if not exists workflows jsonb default '[]';

-- Central audit log (append-only; no update/delete policies for anon)
create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor text,
  action text,
  module text,
  record text,
  detail text,
  created_at timestamptz default now()
);

alter table employee_documents enable row level security;
alter table salary_history enable row level security;
alter table employment_history enable row level security;
alter table audit_logs enable row level security;

do $$ begin
  create policy "demo-all" on employee_documents for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo-all" on salary_history for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo-all" on employment_history for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "demo-insert-read" on audit_logs for all to anon, authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
