import { useAuth } from '../context/AuthContext';

export const ROLES = ['Super Admin', 'HR/Admin', 'Payroll Officer', 'Manager', 'Finance', 'Employee'] as const;
export type Role = (typeof ROLES)[number];

export const MODULES = ['employees', 'attendance', 'leave', 'payroll', 'recruitment', 'performance', 'documents', 'reports', 'settings', 'users'] as const;
export type Module = (typeof MODULES)[number];
export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'] as const;
export type Action = (typeof ACTIONS)[number];

/** Granular permission matrix. `true` = allowed. Kept in code so it works offline; edited only by Super Admin via Users page role assignment. */
const MATRIX: Record<string, Record<string, boolean[]>> = (() => {
  const all = () => [true, true, true, true, true, true];
  const none = () => [false, false, false, false, false, false];
  const viewOnly = () => [true, false, false, false, false, false];
  const M: Record<string, Record<string, boolean[]>> = {};
  M['Super Admin'] = Object.fromEntries(MODULES.map(m => [m, all()]));
  M['HR/Admin'] = { employees: [true,true,true,true,false,true], attendance: [true,true,true,true,true,true], leave: [true,true,true,true,true,true], payroll: [true,false,false,false,false,true], recruitment: [true,true,true,true,true,true], performance: [true,true,true,true,true,true], documents: [true,true,true,true,false,true], reports: [true,false,false,false,false,true], settings: [true,false,true,false,false,false], users: [true,false,false,false,false,false] };
  M['Payroll Officer'] = { employees: [true,false,false,false,false,false], attendance: [true,false,false,false,false,true], leave: [true,false,false,false,false,false], payroll: [true,true,true,false,true,true], recruitment: none(), performance: viewOnly(), documents: [true,false,false,false,false,false], reports: [true,false,false,false,false,true], settings: viewOnly(), users: none() };
  M['Manager'] = { employees: [true,false,false,false,false,false], attendance: [true,false,false,false,true,true], leave: [true,false,false,false,true,false], payroll: viewOnly(), recruitment: [true,true,false,false,true,false], performance: [true,true,true,false,true,false], documents: viewOnly(), reports: [true,false,false,false,false,true], settings: none(), users: none() };
  M['Finance'] = { employees: viewOnly(), attendance: viewOnly(), leave: viewOnly(), payroll: [true,false,false,false,true,true], recruitment: none(), performance: viewOnly(), documents: viewOnly(), reports: [true,false,false,false,false,true], settings: none(), users: none() };
  M['Employee'] = { employees: viewOnly(), attendance: viewOnly(), leave: [true,true,false,false,false,false], payroll: viewOnly(), recruitment: none(), performance: viewOnly(), documents: viewOnly(), reports: none(), settings: none(), users: none() };
  return M;
})();

export function can(role: string | undefined, module: Module, action: Action): boolean {
  const row = MATRIX[role ?? ''];
  if (!row) return false;
  const idx = ACTIONS.indexOf(action);
  return row[module]?.[idx] ?? false;
}

export function useCan() {
  const { user } = useAuth();
  return (module: Module, action: Action) => can(user?.role, module, action);
}

export function roleSummary(role: string): string {
  const row = MATRIX[role];
  if (!row) return 'No access';
  if (Object.values(row).every(a => a.every(Boolean))) return 'Full access';
  const n = Object.values(row).filter(a => a.some(Boolean)).length;
  return `${n} of ${MODULES.length} modules`;
}
