-- Phase 3 — Recruitment → Onboarding → Offboarding
-- Run in Supabase SQL Editor. Idempotent.

create table if not exists job_openings (
  id bigint generated always as identity primary key,
  title text not null,
  dept bigint references departments(id),
  position bigint references positions(id),
  type text,
  location text,
  salary_min numeric default 0,
  salary_max numeric default 0,
  description text,
  requirements text,
  openings numeric default 1,
  status text default 'Open',
  created date
);

create table if not exists applicants (
  id bigint generated always as identity primary key,
  name text not null,
  email text,
  phone text,
  opening_id bigint references job_openings(id) on delete set null,
  source text,
  status text default 'Applied',
  notes text,
  resume text,
  applied_date date,
  history jsonb default '[]',
  doc text
);

create table if not exists interviews (
  id bigint generated always as identity primary key,
  applicant_id bigint references applicants(id) on delete cascade,
  interviewer text,
  date date,
  time text,
  type text,
  result text default 'Pending',
  notes text,
  rating numeric default 0
);

create table if not exists job_offers (
  id bigint generated always as identity primary key,
  applicant_id bigint references applicants(id) on delete cascade,
  salary numeric default 0,
  start_date date,
  type text,
  status text default 'Pending',
  details text,
  stage int default 0,
  history jsonb default '[]'
);

create table if not exists onboarding_templates (
  id bigint generated always as identity primary key,
  name text not null,
  items jsonb default '[]'
);

create table if not exists onboarding (
  id bigint generated always as identity primary key,
  applicant_id bigint references applicants(id) on delete set null,
  emp_id bigint references employees(id) on delete set null,
  emp_name text,
  template text,
  checklist jsonb default '[]',
  status text default 'In Progress',
  started date,
  completed date
);

create table if not exists offboarding (
  id bigint generated always as identity primary key,
  emp_id bigint references employees(id) on delete set null,
  emp_name text,
  type text,
  last_day date,
  clearance jsonb default '[]',
  status text default 'In Progress',
  exit_interview text,
  started date
);

alter table job_openings enable row level security;
alter table applicants enable row level security;
alter table interviews enable row level security;
alter table job_offers enable row level security;
alter table onboarding_templates enable row level security;
alter table onboarding enable row level security;
alter table offboarding enable row level security;

do $$ begin create policy "demo-all" on job_openings for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on applicants for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on interviews for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on job_offers for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on onboarding_templates for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on onboarding for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on offboarding for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
