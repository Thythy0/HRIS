import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Grid, Users, Clock, Calendar, Timer, FileCheck, DollarSign, Building, Briefcase, BarChart3, Bell, Shield, ShieldCheck, ScrollText, Settings, LogOut, UserPlus, ClipboardCheck, UserMinus, FileText, FolderOpen, Megaphone, Wallet, Receipt, Star, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const GROUPS = [
  { title: 'Main', items: [
    { to: '/self-service', label: 'My Dashboard', icon: Grid, roles: ['Employee'] },
    { to: '/dashboard', label: 'Dashboard', icon: Grid, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
    { to: '/employees', label: 'Employees', icon: Users, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
    { to: '/attendance', label: 'Attendance', icon: Clock, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/leave', label: 'Leave', icon: Calendar, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/overtime', label: 'Overtime', icon: Timer, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/corrections', label: 'Corrections', icon: FileCheck, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/requests', label: 'HR Requests', icon: FileText, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/loans', label: 'Loans', icon: Wallet, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/expenses', label: 'Expenses', icon: Receipt, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee', 'Finance'] },
    { to: '/payroll', label: 'Payroll', icon: DollarSign, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
  ]},
  { title: 'Management', items: [
    { to: '/approvals', label: 'Approvals', icon: ShieldCheck, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Finance', 'Payroll Officer'] },
    { to: '/recruitment', label: 'Recruitment', icon: UserPlus, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
    { to: '/onboarding', label: 'Onboarding', icon: ClipboardCheck, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
    { to: '/offboarding', label: 'Offboarding', icon: UserMinus, roles: ['Super Admin', 'HR/Admin'] },
    { to: '/documents', label: 'Documents', icon: FolderOpen, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/performance', label: 'Performance', icon: Star, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
    { to: '/training', label: 'Training', icon: GraduationCap, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
    { to: '/departments', label: 'Departments', icon: Building, roles: ['Super Admin', 'HR/Admin'] },
    { to: '/positions', label: 'Positions', icon: Briefcase, roles: ['Super Admin', 'HR/Admin'] },
    { to: '/schedules', label: 'Schedules', icon: Clock, roles: ['Super Admin', 'HR/Admin'] },
    { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['Super Admin', 'HR/Admin', 'Manager'] },
  ]},
  { title: 'System', items: [
    { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['Super Admin', 'HR/Admin', 'Manager', 'Employee'] },
    { to: '/audit-log', label: 'Audit Log', icon: ScrollText, roles: ['Super Admin'] },
    { to: '/users', label: 'Users & Permissions', icon: Shield, roles: ['Super Admin'] },
    { to: '/settings', label: 'Settings', icon: Settings, roles: ['Super Admin', 'HR/Admin'] },
  ]},
];

export default function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void; }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.name ?? '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '–';

  return (
    <aside id="sidebar" className={`${mobileOpen ? 'open' : ''} w-64 min-h-screen flex flex-col shrink-0 relative z-50`}>
      <div className="side-header">
        <div className="logo-mark">
          <div className="w-9 h-9 rounded-xl bg-[#408A71] flex items-center justify-center text-white shrink-0" aria-hidden><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div className="nav-label-wrap"><h1 className="text-white font-bold leading-tight whitespace-nowrap text-[15px]">HRSuite</h1><p className="text-[11px] text-slate-400 whitespace-nowrap">Attendance and payroll</p></div>
        </div>
      </div>
      <nav className="side-nav" aria-label="Primary">
        {GROUPS.map(g => {
          const items = g.items.filter(i => i.roles.includes(user?.role || ''));
          if (!items.length) return null;
          return (
            <React.Fragment key={g.title}>
              <div className="nav-heading" aria-hidden>{g.title}</div>
              {items.map(i => (
                <NavLink key={i.to} to={i.to} onClick={onCloseMobile}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-indicator"
                          className="sidebar-active-indicator"
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        />
                      )}
                      <span className="nav-icon"><i.icon size={20} strokeWidth={1.8} /></span>
                      <span className="nav-label">{i.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </React.Fragment>
          );
        })}
      </nav>
      <div className="side-footer">
        <div className="side-profile">
          <div className="w-8 h-8 rounded-full bg-[#408A71]/25 text-[#B0E4CC] flex items-center justify-center text-xs font-bold shrink-0" aria-hidden>{initials}</div>
          <div className="nav-label-wrap overflow-hidden"><p className="text-sm text-white font-semibold leading-tight whitespace-nowrap">{user?.name}</p><p className="text-[10px] text-slate-400 whitespace-nowrap">{user?.role}</p></div>
          <button className="ml-auto text-slate-500 hover:text-red-400 transition shrink-0 p-1.5 rounded-lg" onClick={() => { logout(); navigate('/login'); }} title="Log out" aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
  );
}
