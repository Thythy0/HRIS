import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import PageLoader from './components/ui/PageLoader';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SelfService = lazy(() => import('./pages/SelfService'));
const Employees = lazy(() => import('./pages/Employees'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Leave = lazy(() => import('./pages/Leave'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Reports = lazy(() => import('./pages/Reports'));
const Departments = lazy(() => import('./pages/Departments'));
const Positions = lazy(() => import('./pages/Positions'));
const Schedules = lazy(() => import('./pages/Schedules'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Users = lazy(() => import('./pages/Users'));
const Overtime = lazy(() => import('./pages/Overtime'));
const Corrections = lazy(() => import('./pages/Corrections'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Offboarding = lazy(() => import('./pages/Offboarding'));
const Requests = lazy(() => import('./pages/Requests'));
const Documents = lazy(() => import('./pages/Documents'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Loans = lazy(() => import('./pages/Loans'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Performance = lazy(() => import('./pages/Performance'));
const Training = lazy(() => import('./pages/Training'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Approvals = lazy(() => import('./pages/Approvals'));
const Settings = lazy(() => import('./pages/Settings'));

function NavigateTo() {
  let user: any = null;
  try { user = JSON.parse(localStorage.getItem('hrsuite_user') || 'null'); } catch {}
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'Employee' ? '/self-service' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<NavigateTo />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/self-service" element={<SelfService />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/overtime" element={<Overtime />} />
        <Route path="/corrections" element={<Corrections />} />
        <Route path="/recruitment" element={<Recruitment />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/offboarding" element={<Offboarding />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/training" element={<Training />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/payslips" element={<Payroll />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/positions" element={<Positions />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/users" element={<Users />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NavigateTo />} />
    </Routes>
    </Suspense>
  );
}
