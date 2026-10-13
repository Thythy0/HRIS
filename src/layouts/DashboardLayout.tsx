import React, { useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard', '/self-service': 'My Dashboard', '/employees': 'Employees', '/attendance': 'Attendance',
  '/leave': 'Leave Management', '/overtime': 'Overtime', '/corrections': 'Attendance Corrections', '/recruitment': 'Recruitment', '/onboarding': 'Onboarding', '/offboarding': 'Offboarding', '/requests': 'HR Requests', '/documents': 'Documents', '/announcements': 'Announcements', '/loans': 'Loans & Advances', '/expenses': 'Expenses', '/performance': 'Performance', '/training': 'Training', '/payroll': 'Payroll', '/payslips': 'Payslips', '/reports': 'Reports & Analytics', '/departments': 'Departments',
  '/positions': 'Positions', '/schedules': 'Work Schedules', '/notifications': 'Notifications', '/approvals': 'Approval Center', '/audit-log': 'Audit Log', '/users': 'Users & Permissions', '/settings': 'Company Settings',
};

export default function DashboardLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (location.pathname === '/self-service' && user.role !== 'Employee') return <Navigate to="/dashboard" replace />;
  if (user.role === 'Employee') {
    const allowed = ['/', '/self-service', '/attendance', '/leave', '/overtime', '/corrections', '/requests', '/loans', '/expenses', '/documents', '/announcements', '/payroll', '/payslips', '/notifications'];
    if (!allowed.includes(location.pathname)) return <Navigate to="/self-service" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div id="overlay" className={`fixed inset-0 bg-slate-900/50 z-40 transition-opacity duration-300 lg:hidden ${mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileOpen(false)}></div>
      <main className="app-main">
        <Header title={TITLES[location.pathname] || 'Dashboard'} onMenu={() => setMobileOpen(true)} />
        <div key={location.pathname} className="page-anim p-4 md:p-6 w-full max-w-[1280px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
