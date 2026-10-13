-- Payroll periods engine + earning/deduction config + PH compliance tables
-- Run in Supabase SQL Editor after schema.sql. Idempotent.

-- 1) Company payroll config (JSON: earningTypes, deductionTypes, ph rates)
alter table company add column if not exists payroll_config jsonb default null;

-- 2) Period workflow state
alter table payroll_periods add column if not exists stage int default 0;
alter table payroll_periods add column if not exists history jsonb default '[]';

-- 3) Reference tables (authoritative PH schedules; app caches them in company.payroll_config for offline use)
create table if not exists earning_types (
  code text primary key,
  name text not null,
  formula text,
  taxable boolean default true,
  enabled boolean default true
);

create table if not exists deduction_types (
  code text primary key,
  name text not null,
  basis text,
  enabled boolean default true
);

create table if not exists sss_brackets (
  id bigint generated always as identity primary key,
  salary_min numeric not null,
  salary_max numeric,
  msc numeric not null,
  ee numeric not null,
  er numeric not null,
  ec numeric not null default 10,
  effective_from date default '2025-01-01'
);

create table if not exists philhealth_config (
  id bigint primary key,
  rate numeric not null default 0.05,
  ee_share numeric not null default 0.5,
  floor_msc numeric not null default 10000,
  cap_msc numeric not null default 100000,
  effective_from date default '2025-01-01'
);

create table if not exists pagibig_config (
  id bigint primary key,
  rate_low numeric not null default 0.01,
  rate numeric not null default 0.02,
  threshold numeric not null default 1500,
  cap numeric not null default 10000,
  effective_from date default '2024-02-01'
);

create table if not exists bir_tax_brackets (
  id bigint generated always as identity primary key,
  monthly_min numeric not null,
  monthly_max numeric,
  base numeric not null default 0,
  rate numeric not null default 0,
  excess_over numeric not null default 0,
  effective_from date default '2023-01-01'
);

-- 4) RLS + demo policies
alter table earning_types enable row level security;
alter table deduction_types enable row level security;
alter table sss_brackets enable row level security;
alter table philhealth_config enable row level security;
alter table pagibig_config enable row level security;
alter table bir_tax_brackets enable row level security;

do $$ begin create policy "demo-all" on earning_types for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on deduction_types for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on sss_brackets for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on philhealth_config for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on pagibig_config for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "demo-all" on bir_tax_brackets for all to anon, authenticated using (true) with check (true); exception when duplicate_object then null; end $$;

-- 5) Seed reference data
insert into earning_types (code, name, formula, taxable, enabled) values
  ('BASIC','Basic Salary','Monthly salary ÷ 2 cut-offs', true, true),
  ('OT','Overtime','Hours × (monthly ÷ 22 ÷ 8) × 1.25', true, true),
  ('HOLIDAY','Holiday Pay','Regular +100% daily, Special +30% daily', true, true),
  ('NIGHT','Night Differential','10% of hourly × night hrs', true, true),
  ('ALLOW','Allowances','Monthly allowance ÷ 2', false, true),
  ('BONUS','Bonuses','Manual per cut-off', true, true)
on conflict (code) do update set name=excluded.name, formula=excluded.formula;

insert into deduction_types (code, name, basis, enabled) values
  ('SSS','SSS','5% EE of MSC (5k–35k), 2025 table', true),
  ('PHILHEALTH','PhilHealth','2.5% EE of base (10k–100k MSC)', true),
  ('PAGIBIG','Pag-IBIG','2% EE (1% if <₱1,500), cap ₱10k MFS', true),
  ('TAX','Withholding Tax','BIR TRAIN monthly brackets ÷ 2', true),
  ('LOANS','Loans','Fixed amortization (editable per run)', true),
  ('ABSENCES','Absences','Daily rate (monthly ÷ 22) × absent days', true),
  ('LATES','Lates','Per-minute (daily ÷ 8 ÷ 60) × late mins', true)
on conflict (code) do update set name=excluded.name, basis=excluded.basis;

insert into philhealth_config (id, rate, ee_share, floor_msc, cap_msc, effective_from) values
  (1, 0.05, 0.5, 10000, 100000, '2025-01-01')
on conflict (id) do update set rate=excluded.rate, ee_share=excluded.ee_share;

insert into pagibig_config (id, rate_low, rate, threshold, cap, effective_from) values
  (1, 0.01, 0.02, 1500, 10000, '2024-02-01')
on conflict (id) do update set rate=excluded.rate, cap=excluded.cap;

-- TRAIN monthly brackets (annual ÷ 12)
insert into bir_tax_brackets (monthly_min, monthly_max, base, rate, excess_over, effective_from) values
  (0, 20833.33, 0, 0, 0, '2023-01-01'),
  (20833.33, 33333.33, 0, 0.15, 20833.33, '2023-01-01'),
  (33333.33, 66666.67, 1875, 0.20, 33333.33, '2023-01-01'),
  (66666.67, 166666.67, 8541.67, 0.25, 66666.67, '2023-01-01'),
  (166666.67, 666666.67, 33541.67, 0.30, 166666.67, '2023-01-01'),
  (666666.67, null, 183541.67, 0.35, 666666.67, '2023-01-01')
on conflict do nothing;

-- SSS 2025 sample brackets (MSC 5k–35k, 5% EE / 10% ER; EC 10 below 15k MSC else 30).
-- Full 31-row table collapsed to representative rows; app computes MSC by rounding — these rows document the schedule.
delete from sss_brackets where effective_from = '2025-01-01';
insert into sss_brackets (salary_min, salary_max, msc, ee, er, ec, effective_from) values
  (0, 5249.99, 5000, 250, 500, 10, '2025-01-01'),
  (5250, 6249.99, 6000, 300, 600, 10, '2025-01-01'),
  (6250, 7249.99, 7000, 350, 700, 10, '2025-01-01'),
  (7250, 8249.99, 8000, 400, 800, 10, '2025-01-01'),
  (8250, 9249.99, 9000, 450, 900, 10, '2025-01-01'),
  (9250, 10249.99, 10000, 500, 1000, 10, '2025-01-01'),
  (15250, 16249.99, 16000, 800, 1600, 30, '2025-01-01'),
  (20250, 21249.99, 21000, 1050, 2100, 30, '2025-01-01'),
  (25250, 26249.99, 26000, 1300, 2600, 30, '2025-01-01'),
  (30250, 31249.99, 31000, 1550, 3100, 30, '2025-01-01'),
  (34250, 9999999, 35000, 1750, 3500, 30, '2025-01-01');
