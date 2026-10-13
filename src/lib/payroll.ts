import { getDB, saveDB } from '../data/mock';

/** Payroll periods engine + earning/deduction config + PH statutory tables (SSS/PhilHealth/Pag-IBIG/BIR-TRAIN).
 * Offline-first: config lives in company.payrollConfig (synced as JSON), calculations are pure functions.
 * PH values below track 2025 schedules and are editable in Settings — update when agencies publish new tables.
 */

export interface EarningType { code: string; name: string; kind: 'earning'; formula: string; taxable: boolean; enabled: boolean }
export interface DeductionType { code: string; name: string; kind: 'deduction'; basis: string; enabled: boolean }

export interface PHConfig {
  sss: { rateEE: number; rateER: number; minMSC: number; maxMSC: number; ecLow: number; ecHigh: number; ecThreshold: number; effective: string };
  philhealth: { rate: number; share: number; min: number; max: number; effective: string };
  pagibig: { rateLow: number; rate: number; threshold: number; cap: number; effective: string };
  otMultiplier: number;
  nightDiffRate: number;
  workDaysPerMonth: number;
  taxNote: string;
}

export interface PayrollConfig {
  earningTypes: EarningType[];
  deductionTypes: DeductionType[];
  ph: PHConfig;
}

export function defaultPayrollConfig(): PayrollConfig {
  return {
    earningTypes: [
      { code: 'BASIC', name: 'Basic Salary', kind: 'earning', formula: 'Monthly salary ÷ 2 cut-offs', taxable: true, enabled: true },
      { code: 'OT', name: 'Overtime', kind: 'earning', formula: 'Hours × (monthly ÷ 22 ÷ 8) × 1.25', taxable: true, enabled: true },
      { code: 'HOLIDAY', name: 'Holiday Pay', kind: 'earning', formula: 'Regular +100% daily, Special +30% daily', taxable: true, enabled: true },
      { code: 'NIGHT', name: 'Night Differential', kind: 'earning', formula: '10% of hourly × night hrs (10PM–6AM)', taxable: true, enabled: true },
      { code: 'ALLOW', name: 'Allowances', kind: 'earning', formula: 'Monthly allowance ÷ 2', taxable: false, enabled: true },
      { code: 'BONUS', name: 'Bonuses', kind: 'earning', formula: 'Manual per cut-off', taxable: true, enabled: true },
    ],
    deductionTypes: [
      { code: 'SSS', name: 'SSS', kind: 'deduction', basis: '5% EE of MSC (5k–35k), 2025 table', enabled: true },
      { code: 'PHILHEALTH', name: 'PhilHealth', kind: 'deduction', basis: '2.5% EE of base (10k–100k MSC), 5% total', enabled: true },
      { code: 'PAGIBIG', name: 'Pag-IBIG', kind: 'deduction', basis: '2% EE (1% if <₱1,500), cap ₱10k MFS', enabled: true },
      { code: 'TAX', name: 'Withholding Tax', kind: 'deduction', basis: 'BIR TRAIN monthly brackets ÷ 2', enabled: true },
      { code: 'LOANS', name: 'Loans', kind: 'deduction', basis: 'Fixed amortization (editable per run)', enabled: true },
      { code: 'ABSENCES', name: 'Absences', kind: 'deduction', basis: 'Daily rate (monthly ÷ 22) × absent days', enabled: true },
      { code: 'LATES', name: 'Lates', kind: 'deduction', basis: 'Per-minute (daily ÷ 8 ÷ 60) × late mins', enabled: true },
    ],
    ph: {
      sss: { rateEE: 0.05, rateER: 0.10, minMSC: 5000, maxMSC: 35000, ecLow: 10, ecHigh: 30, ecThreshold: 15000, effective: '2025-01-01' },
      philhealth: { rate: 0.05, share: 0.5, min: 10000, max: 100000, effective: '2025-01-01' },
      pagibig: { rateLow: 0.01, rate: 0.02, threshold: 1500, cap: 10000, effective: '2024-02-01' },
      otMultiplier: 1.25,
      nightDiffRate: 0.10,
      workDaysPerMonth: 22,
      taxNote: 'TRAIN annual ÷ 12, semi = monthly ÷ 2. Taxable = monthly gross − SSS/PhilHealth/Pag-IBIG (EE).',
    },
  };
}

export function getPayrollConfig(db?: any): PayrollConfig {
  const d = db ?? getDB();
  const cfg = (d.company as any)?.payrollConfig as PayrollConfig | undefined;
  if (cfg?.ph && Array.isArray(cfg.earningTypes)) return cfg;
  return defaultPayrollConfig();
}

export function ensurePayrollConfig(): PayrollConfig {
  const d = getDB();
  let dirty = false;
  if (!(d.company as any)) (d as any).company = {};
  if (!(d.company as any).payrollConfig) { (d.company as any).payrollConfig = defaultPayrollConfig(); dirty = true; }
  else {
    const c = (d.company as any).payrollConfig as any;
    const def = defaultPayrollConfig();
    if (!Array.isArray(c.earningTypes)) { c.earningTypes = def.earningTypes; dirty = true; }
    if (!Array.isArray(c.deductionTypes)) { c.deductionTypes = def.deductionTypes; dirty = true; }
    if (!c.ph) { c.ph = def.ph; dirty = true; }
  }
  // Backfill period stage/history for workflow approvals
  let pDirty = false;
  (d.payrollPeriods ?? []).forEach((p: any) => {
    if (typeof p.stage !== 'number') { p.stage = p.status === 'Approved' || p.status === 'Paid' ? 99 : 0; pDirty = true; }
    if (!Array.isArray(p.history)) { p.history = []; pDirty = true; }
  });
  if (dirty || pDirty) saveDB(d);
  return (d.company as any).payrollConfig;
}

// ---------- PH calculators (monthly base in PHP) ----------

export function sssMSC(monthly: number, ph?: PHConfig['sss']): number {
  const c = ph ?? defaultPayrollConfig().ph.sss;
  const m = Number(monthly) || 0;
  const rounded = Math.round(m / 1000) * 1000;
  return Math.min(c.maxMSC, Math.max(c.minMSC, rounded));
}

export function sssEE(monthly: number, cfg?: PayrollConfig): number {
  const c = (cfg ?? defaultPayrollConfig()).ph.sss;
  return Math.round(sssMSC(monthly, c) * c.rateEE * 100) / 100;
}

export function sssER(monthly: number, cfg?: PayrollConfig): { er: number; ec: number } {
  const c = (cfg ?? defaultPayrollConfig()).ph.sss;
  const msc = sssMSC(monthly, c);
  const er = Math.round(msc * c.rateER * 100) / 100;
  const ec = msc < c.ecThreshold ? c.ecLow : c.ecHigh;
  return { er, ec };
}

export function philhealthEE(monthly: number, cfg?: PayrollConfig): number {
  const c = (cfg ?? defaultPayrollConfig()).ph.philhealth;
  const base = Math.min(c.max, Math.max(c.min, Number(monthly) || 0));
  return Math.round(base * c.rate * c.share * 100) / 100;
}

export function pagibigEE(monthly: number, cfg?: PayrollConfig): number {
  const c = (cfg ?? defaultPayrollConfig()).ph.pagibig;
  const m = Number(monthly) || 0;
  const base = Math.min(c.cap, m);
  const rate = m < c.threshold ? c.rateLow : c.rate;
  return Math.round(base * rate * 100) / 100;
}

// TRAIN monthly tax (2023+ still in effect 2026). Input = monthly taxable income.
export function trainMonthlyTax(monthlyTaxable: number): number {
  const t = Math.max(0, Number(monthlyTaxable) || 0);
  if (t <= 20833.33) return 0;
  if (t <= 33333.33) return (t - 20833.33) * 0.15;
  if (t <= 66666.67) return 1875 + (t - 33333.33) * 0.20;
  if (t <= 166666.67) return 8541.67 + (t - 66666.67) * 0.25;
  if (t <= 666666.67) return 33541.67 + (t - 166666.67) * 0.30;
  return 183541.67 + (t - 666666.67) * 0.35;
}

export function withholdingSemi(monthlyGross: number, sssM: number, phM: number, pagM: number): number {
  const taxableMonthly = Math.max(0, monthlyGross - sssM - phM - pagM);
  return Math.round((trainMonthlyTax(taxableMonthly) / 2) * 100) / 100;
}

// ---------- Periods ----------

function monthName(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
}

export function buildSemiMonthly(year: number, startId = 1): any[] {
  const out: any[] = [];
  let id = startId;
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    const pad = (n: number) => String(n).padStart(2, '0');
    out.push({
      id: id++, label: `${monthName(m)} 1–15, ${year}`,
      from: `${year}-${pad(m + 1)}-01`, to: `${year}-${pad(m + 1)}-15`,
      status: 'Draft', stage: 0, history: [],
    });
    out.push({
      id: id++, label: `${monthName(m)} 16–${lastDay}, ${year}`,
      from: `${year}-${pad(m + 1)}-16`, to: `${year}-${pad(m + 1)}-${pad(lastDay)}`,
      status: 'Draft', stage: 0, history: [],
    });
  }
  return out;
}

export function ensurePeriods(year?: number): any[] {
  const d = getDB();
  const y = year ?? new Date().getFullYear();
  if (!Array.isArray(d.payrollPeriods)) d.payrollPeriods = [];
  const hasYear = d.payrollPeriods.some((p: any) => String(p.from ?? '').startsWith(String(y)));
  if (!hasYear) {
    const maxId = d.payrollPeriods.reduce((m: number, p: any) => Math.max(m, Number(p.id) || 0), 0);
    const fresh = buildSemiMonthly(y, maxId + 1);
    const existing = new Set(d.payrollPeriods.map((p: any) => `${p.from}|${p.to}`));
    fresh.forEach(p => { if (!existing.has(`${p.from}|${p.to}`)) d.payrollPeriods.push(p); });
    d.payrollPeriods.sort((a: any, b: any) => String(a.from).localeCompare(String(b.from)));
    saveDB(d);
  } else {
    let dirty = false;
    d.payrollPeriods.forEach((p: any) => {
      if (typeof p.stage !== 'number') { p.stage = 0; dirty = true; }
      if (!Array.isArray(p.history)) { p.history = []; dirty = true; }
    });
    if (dirty) saveDB(d);
  }
  return getDB().payrollPeriods;
}

// ---------- Attendance aggregation ----------

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function weekdaysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export interface CalcBreakdown {
  daysWorked: number; absentDays: number; leaveDays: number; lateMins: number;
  otHrs: number; holidayPay: number; dailyRate: number; hourlyRate: number;
  sssMonthly: number; phMonthly: number; pagMonthly: number; taxableMonthly: number; monthlyTax: number;
}

export function calculateEmployee(emp: any, period: any, db: any, cfg?: PayrollConfig): { record: any; breakdown: CalcBreakdown } {
  const c = cfg ?? getPayrollConfig(db);
  const monthly: number = Number(emp.salary) || 0;
  const monthlyAllow: number = Number(emp.allowances) || 0;
  const dailyRate = monthly / c.ph.workDaysPerMonth;
  const hourlyRate = dailyRate / 8;

  const att = (db.attendance ?? []).filter((a: any) => a.empId === emp.id && inRange(a.date, period.from, period.to));
  let daysWorked = 0, lateMins = 0, leaveDays = 0;
  att.forEach((a: any) => {
    if (a.status === 'Present' || a.status === 'Late') daysWorked += 1;
    else if (a.status === 'Half Day') daysWorked += 0.5;
    else if (a.status === 'On Leave') leaveDays += 1;
    lateMins += Number(a.late) || 0;
  });
  const workdays = weekdaysBetween(period.from, period.to).length;
  const absentDays = Math.max(0, workdays - daysWorked - leaveDays);

  const otHrs = (db.overtimeRequests ?? [])
    .filter((o: any) => o.empId === emp.id && o.status === 'Approved' && o.date >= period.from && o.date <= period.to)
    .reduce((s: number, o: any) => s + (Number(o.hours) || 0), 0);

  // Holiday pay: present on a holiday in range
  const holidays = (db.holidays ?? []).filter((h: any) => h.date >= period.from && h.date <= period.to);
  let holidayPay = 0;
  att.forEach((a: any) => {
    const h = holidays.find((x: any) => x.date === a.date);
    if (!h) return;
    if (a.status !== 'Present' && a.status !== 'Late' && a.status !== 'Half Day') return;
    const factor = String(h.type).toLowerCase().includes('regular') ? 1.0 : 0.3;
    const dayFactor = a.status === 'Half Day' ? 0.5 : 1;
    holidayPay += dailyRate * factor * dayFactor;
  });
  holidayPay = Math.round(holidayPay * 100) / 100;

  const basic = Math.round((monthly / 2) * 100) / 100;
  const allow = Math.round((monthlyAllow / 2) * 100) / 100;
  const overtime = Math.round(otHrs * hourlyRate * c.ph.otMultiplier * 100) / 100;
  const nightDiff = 0; // tracked when shift data carries night hours; rate kept in config
  const prev = (db.payrollRecords ?? []).find((r: any) => r.empId === emp.id && r.periodId === period.id);
  const bonus = Number(prev?.bonus) || 0;
  const autoLoans = (db.loans ?? []).filter((l: any) => l.empId === emp.id && l.status === 'Active')
    .reduce((s: number, l: any) => s + (Number(l.deductedPerPay) || 0), 0);
  const manualLoans = Number((prev as any)?.loansManual ?? 0);
  const loans = Math.round((autoLoans + manualLoans) * 100) / 100;
  const gross = Math.round((basic + overtime + holidayPay + nightDiff + allow + bonus) * 100) / 100;

  const en = Object.fromEntries((c.earningTypes ?? []).map(e => [e.code, e.enabled !== false]));
  const de = Object.fromEntries((c.deductionTypes ?? []).map(e => [e.code, e.enabled !== false]));

  const monthlyGross = gross * 2;
  const sssM = de['SSS'] === false ? 0 : sssEE(monthly, c); // monthly EE
  // philhealthEE(monthly) returns monthly EE share:
  const phMonthly = de['PHILHEALTH'] === false ? 0 : philhealthEE(monthly, c);
  const pagMonthly = de['PAGIBIG'] === false ? 0 : pagibigEE(monthly, c);
  const sss = de['SSS'] === false ? 0 : Math.round((sssM / 2) * 100) / 100;
  const philhealth = de['PHILHEALTH'] === false ? 0 : Math.round((phMonthly / 2) * 100) / 100;
  const pagibig = de['PAGIBIG'] === false ? 0 : Math.round((pagMonthly / 2) * 100) / 100;
  const tax = de['TAX'] === false ? 0 : withholdingSemi(monthlyGross, sssM, phMonthly, pagMonthly);
  const absences = de['ABSENCES'] === false ? 0 : Math.round(absentDays * dailyRate * 100) / 100;
  const lates = de['LATES'] === false ? 0 : Math.round(lateMins * (dailyRate / 8 / 60) * 100) / 100;

  const totalDed = Math.round((sss + philhealth + pagibig + tax + loans + absences + lates) * 100) / 100;
  const net = Math.round((gross - totalDed) * 100) / 100;

  const record = {
    id: prev?.id ?? Date.now() + emp.id,
    empId: emp.id, periodId: period.id,
    daysWorked, overtimeHrs: String(Math.round(otHrs * 10) / 10),
    basic: en['BASIC'] === false ? 0 : basic,
    overtime: en['OT'] === false ? 0 : overtime,
    holiday: en['HOLIDAY'] === false ? 0 : holidayPay,
    nightDiff: en['NIGHT'] === false ? 0 : nightDiff,
    allowances: en['ALLOW'] === false ? 0 : allow,
    bonus: en['BONUS'] === false ? 0 : bonus,
    gross, sss, philhealth, pagibig, tax,
    loans: de['LOANS'] === false ? 0 : loans,
    absences, lates, totalDed, net,
    status: prev?.status === 'Approved' || prev?.status === 'Paid' ? prev.status : 'Calculated',
  };
  const breakdown: CalcBreakdown = {
    daysWorked, absentDays, leaveDays, lateMins, otHrs, holidayPay, dailyRate, hourlyRate,
    sssMonthly: sssM, phMonthly, pagMonthly, taxableMonthly: Math.max(0, monthlyGross - sssM - phMonthly - pagMonthly),
    monthlyTax: Math.round(trainMonthlyTax(Math.max(0, monthlyGross - sssM - phMonthly - pagMonthly)) * 100) / 100,
  };
  return { record, breakdown };
}

export function calculatePeriod(periodId: number): number {
  const db = getDB();
  const cfg = ensurePayrollConfig();
  const period = (db.payrollPeriods ?? []).find((p: any) => p.id === periodId);
  if (!period) return 0;
  if (period.status === 'Paid' || period.status === 'Locked' || period.status === 'Approved') return 0;
  const employees = (db.employees ?? []).filter((e: any) => e.status === 'Active');
  let n = 0;
  employees.forEach((emp: any) => {
    const { record } = calculateEmployee(emp, period, db, cfg);
    const i = db.payrollRecords.findIndex((r: any) => r.empId === emp.id && r.periodId === period.id);
    if (i >= 0) db.payrollRecords[i] = { ...db.payrollRecords[i], ...record };
    else db.payrollRecords.push(record);
    n++;
  });
  period.status = 'Processing';
  saveDB(db);
  return n;
}
