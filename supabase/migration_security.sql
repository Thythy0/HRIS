-- =============================================================================
-- HRSuite security hardening migration
--
-- Run in the Supabase SQL Editor AFTER schema.sql and every migration_*.sql.
-- Idempotent — safe to re-run. Requires the pgcrypto extension (enabled below;
-- it is on the Supabase allowlist).
--
-- What it does:
--   1. Links the users table to Supabase Auth (auth_uid) and to employee
--      records (emp_id), bootstraps auth.users accounts for the demo seed
--      (bcrypt via pgcrypto), and drops the plaintext pass column.
--   2. Installs role helpers used by RLS policies (security definer).
--   3. Drops every permissive "demo-all" / "demo-insert-read" policy and
--      replaces them with role-based policies that mirror the app's permission
--      matrix (src/lib/permissions.ts).
--
-- Policy legend:
--   read  = which signed-in roles may SELECT
--   write = which signed-in roles may INSERT / UPDATE / DELETE
--   OWN   = row linked to the caller via users.emp_id
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Account linkage
-- ---------------------------------------------------------------------------
alter table users add column if not exists auth_uid uuid unique references auth.users(id);
alter table users add column if not exists emp_id bigint references employees(id);
create index if not exists users_auth_uid_idx on users (auth_uid);
create index if not exists users_emp_id_idx on users (emp_id);

-- ---------------------------------------------------------------------------
-- 2. Bootstrap auth accounts for the demo seed
--    Creates auth.users entries (bcrypt-hashed passwords) for every users row
--    that still carries a plaintext pass and has no auth account yet.
--    Accounts are pre-confirmed so no verification email is required.
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

do $$
begin
  set local search_path = public, extensions;
  insert into auth.users (
    instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    u.email,
    crypt(u.pass, gen_salt('bf')),
    now(),
    '{}'::jsonb,
    jsonb_build_object('full_name', u.name),
    now(), now()
  from users u
  where u.pass is not null
    and not exists (select 1 from auth.users au where au.email = u.email);
end $$;

-- Link existing auth accounts (by email) and employee records (by name)
update users u
set auth_uid = au.id
from auth.users au
where au.email = u.email and u.auth_uid is null;

update users u
set emp_id = e.id
from employees e
where lower(e.name) = lower(u.name) and u.emp_id is null;

-- Plaintext passwords are gone from the database for good
alter table users drop column if exists pass;

-- ---------------------------------------------------------------------------
-- 3. Role helpers (security definer — they read the users table on behalf of
--    the caller, so RLS policies can use them)
-- ---------------------------------------------------------------------------
create or replace function app_role() returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select u.role from users u where u.auth_uid = auth.uid()), '');
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select app_role() in ('Super Admin', 'HR/Admin');
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public
as $$
  select is_admin() or app_role() = 'Manager';
$$;

create or replace function is_payroll() returns boolean
language sql stable security definer set search_path = public
as $$
  select is_admin() or app_role() in ('Payroll Officer', 'Finance');
$$;

create or replace function is_hr_viewer() returns boolean
language sql stable security definer set search_path = public
as $$
  select is_staff() or is_payroll();
$$;

create or replace function own_emp_ids() returns bigint[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(u.emp_id) filter (where u.emp_id is not null), '{}'::bigint[])
  from users u
  where u.auth_uid = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 4. Drop the permissive demo policies
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname in ('demo-all', 'demo-insert-read')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Role-based policies
-- ---------------------------------------------------------------------------

-- Group A — reference & company data: any signed-in user reads; HR/Admin writes
do $$
declare
  t text;
begin
  foreach t in array array[
    'departments', 'positions', 'schedules', 'holidays', 'leave_types',
    'announcements', 'notifications', 'activity', 'company', 'trainings',
    'payroll_periods'
  ] loop
    execute format('drop policy if exists "read-authenticated" on %I', t);
    execute format('create policy "read-authenticated" on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists "write-admin" on %I', t);
    execute format('create policy "write-admin" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Group B — payroll configuration (SSS/PhilHealth/Pag-IBIG/BIR tables):
-- any signed-in user reads; payroll roles write. Rates stay configurable,
-- never hardcoded in the app.
do $$
declare
  t text;
begin
  foreach t in array array[
    'earning_types', 'deduction_types', 'sss_brackets', 'philhealth_config',
    'pagibig_config', 'bir_tax_brackets'
  ] loop
    execute format('drop policy if exists "read-authenticated" on %I', t);
    execute format('create policy "read-authenticated" on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists "write-payroll" on %I', t);
    execute format('create policy "write-payroll" on %I for all to authenticated using (is_payroll()) with check (is_payroll())', t);
  end loop;
end $$;

-- Accounts: any signed-in user reads the directory; only HR/Admin writes
do $$ begin
  execute 'drop policy if exists "read-authenticated" on users';
  execute 'create policy "read-authenticated" on users for select to authenticated using (true)';
  execute 'drop policy if exists "write-admin" on users';
  execute 'create policy "write-admin" on users for all to authenticated using (is_admin()) with check (is_admin())';
end $$;

-- Employee directory: HR staff sees all, employees see only their own record;
-- only HR/Admin writes
do $$ begin
  execute 'drop policy if exists "read-hr-or-own" on employees';
  execute 'create policy "read-hr-or-own" on employees for select to authenticated using (is_hr_viewer() or id = any(own_emp_ids()))';
  execute 'drop policy if exists "write-admin" on employees';
  execute 'create policy "write-admin" on employees for all to authenticated using (is_admin()) with check (is_admin())';
end $$;

-- Attendance: HR staff sees all, employees see their own; employees clock in
-- (insert own row); HR/Admin and Managers update/delete
do $$ begin
  execute 'drop policy if exists "read-hr-or-own" on attendance';
  execute 'create policy "read-hr-or-own" on attendance for select to authenticated using (is_hr_viewer() or emp_id = any(own_emp_ids()))';
  execute 'drop policy if exists "insert-own-or-admin" on attendance';
  execute 'create policy "insert-own-or-admin" on attendance for insert to authenticated with check (is_admin() or emp_id = any(own_emp_ids()))';
  execute 'drop policy if exists "update-staff" on attendance';
  execute 'create policy "update-staff" on attendance for update to authenticated using (is_staff()) with check (is_staff())';
  execute 'drop policy if exists "delete-staff" on attendance';
  execute 'create policy "delete-staff" on attendance for delete to authenticated using (is_staff())';
end $$;

-- Requests (leave / overtime / attendance corrections): HR staff sees all,
-- employees see and create their own; employees may edit/withdraw while the
-- request is still Pending; HR/Admin and Managers approve (update/delete)
do $$
declare
  t text;
begin
  foreach t in array array['leave_requests', 'overtime_requests', 'correction_requests'] loop
    execute format('drop policy if exists "read-hr-or-own" on %I', t);
    execute format('create policy "read-hr-or-own" on %I for select to authenticated using (is_hr_viewer() or emp_id = any(own_emp_ids()))', t);
    execute format('drop policy if exists "insert-own-or-admin" on %I', t);
    execute format('create policy "insert-own-or-admin" on %I for insert to authenticated with check (is_admin() or emp_id = any(own_emp_ids()))', t);
    execute format('drop policy if exists "update-staff-or-own-pending" on %I', t);
    execute format('create policy "update-staff-or-own-pending" on %I for update to authenticated using (is_staff() or (emp_id = any(own_emp_ids()) and status = ''Pending'')) with check (is_staff() or (emp_id = any(own_emp_ids()) and status = ''Pending''))', t);
    execute format('drop policy if exists "delete-staff" on %I', t);
    execute format('create policy "delete-staff" on %I for delete to authenticated using (is_staff())', t);
  end loop;
end $$;

-- Payslips: payroll roles see all, employees see their own; payroll roles write
do $$ begin
  execute 'drop policy if exists "read-payroll-or-own" on payroll_records';
  execute 'create policy "read-payroll-or-own" on payroll_records for select to authenticated using (is_payroll() or emp_id = any(own_emp_ids()))';
  execute 'drop policy if exists "write-payroll" on payroll_records';
  execute 'create policy "write-payroll" on payroll_records for all to authenticated using (is_payroll()) with check (is_payroll())';
end $$;

-- Audit log: append-only. Signed-in users may insert (the Edge Function
-- resolves the actor server-side, and this policy pins actor to the caller's
-- own name); only HR/Admin may read. No update/delete policies exist on
-- purpose — logs cannot be altered or removed through the API.
do $$ begin
  execute 'drop policy if exists "read-admin" on audit_logs';
  execute 'create policy "read-admin" on audit_logs for select to authenticated using (is_admin())';
  execute 'drop policy if exists "insert-self" on audit_logs';
  execute 'create policy "insert-self" on audit_logs for insert to authenticated with check (actor = (select u.name from users u where u.auth_uid = auth.uid()))';
end $$;

-- Compensation & status history: HR staff sees all, employees see their own;
-- only HR/Admin writes
do $$
declare
  t text;
begin
  foreach t in array array['salary_history', 'employment_history'] loop
    execute format('drop policy if exists "read-staff-or-own" on %I', t);
    execute format('create policy "read-staff-or-own" on %I for select to authenticated using (is_staff() or emp_id = any(own_emp_ids()))', t);
    execute format('drop policy if exists "write-admin" on %I', t);
    execute format('create policy "write-admin" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Employee documents: HR staff sees all, employees see their own;
-- only HR/Admin writes
do $$ begin
  execute 'drop policy if exists "read-hr-or-own" on employee_documents';
  execute 'create policy "read-hr-or-own" on employee_documents for select to authenticated using (is_hr_viewer() or emp_id = any(own_emp_ids()))';
  execute 'drop policy if exists "write-admin" on employee_documents';
  execute 'create policy "write-admin" on employee_documents for all to authenticated using (is_admin()) with check (is_admin())';
end $$;

-- Loans, expenses, HR requests: HR staff sees all, employees see their own;
-- employees create their own and edit while Pending; HR staff approves
do $$
declare
  t text;
begin
  foreach t in array array['loans', 'expenses', 'hr_requests'] loop
    execute format('drop policy if exists "read-hr-or-own" on %I', t);
    execute format('create policy "read-hr-or-own" on %I for select to authenticated using (is_hr_viewer() or emp_id = any(own_emp_ids()))', t);
    execute format('drop policy if exists "insert-own-or-admin" on %I', t);
    execute format('create policy "insert-own-or-admin" on %I for insert to authenticated with check (is_admin() or emp_id = any(own_emp_ids()))', t);
    execute format('drop policy if exists "update-staff-or-own-pending" on %I', t);
    execute format('create policy "update-staff-or-own-pending" on %I for update to authenticated using (is_staff() or (emp_id = any(own_emp_ids()) and status = ''Pending'')) with check (is_staff() or (emp_id = any(own_emp_ids()) and status = ''Pending''))', t);
    execute format('drop policy if exists "delete-staff" on %I', t);
    execute format('create policy "delete-staff" on %I for delete to authenticated using (is_staff())', t);
  end loop;
end $$;

-- Performance records (goals, reviews, skills, training records):
-- HR staff sees all, employees see their own; HR/Admin and Managers write
do $$
declare
  t text;
begin
  foreach t in array array['goals', 'reviews', 'skills', 'training_records'] loop
    execute format('drop policy if exists "read-hr-or-own" on %I', t);
    execute format('create policy "read-hr-or-own" on %I for select to authenticated using (is_hr_viewer() or emp_id = any(own_emp_ids()))', t);
    execute format('drop policy if exists "write-staff" on %I', t);
    execute format('create policy "write-staff" on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

-- Recruitment & lifecycle: HR staff reads and writes; only HR/Admin deletes
do $$
declare
  t text;
begin
  foreach t in array array[
    'job_openings', 'applicants', 'interviews', 'job_offers',
    'onboarding', 'onboarding_templates', 'offboarding'
  ] loop
    execute format('drop policy if exists "read-staff" on %I', t);
    execute format('create policy "read-staff" on %I for select to authenticated using (is_staff())', t);
    execute format('drop policy if exists "write-staff" on %I', t);
    execute format('create policy "write-staff" on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
    execute format('drop policy if exists "delete-admin" on %I', t);
    execute format('create policy "delete-admin" on %I for delete to authenticated using (is_admin())', t);
  end loop;
end $$;

commit;
