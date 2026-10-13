import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDB } from '../../data/mock';
import { useAuth } from '../../context/AuthContext';
import GlobalSearch from './GlobalSearch';

function safeUser() {
  try { return JSON.parse(localStorage.getItem('hrsuite_user') || 'null'); } catch { return null; }
}

export default function Header({ title, onMenu }: { title: string; onMenu: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayUser = user ?? safeUser();
  const initials = (displayUser?.name ?? '').split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '–';
  let unread = 0;
  try { unread = (getDB()?.notifications ?? []).filter((n: any) => n.unread).length; } catch { unread = 0; }
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e4ece8] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button className="hamburger btn btn-outline btn-sm" onClick={onMenu} aria-label="Open menu">☰</button>
        <div className="min-w-0">
          <h2 className="font-bold truncate leading-tight">{title}</h2>
          <p className="text-[11px] text-slate-400 leading-tight">{today}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <GlobalSearch />
        <button className="relative w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center hover:border-[#B0E4CC] hover:bg-[#EFF7F2] transition" onClick={() => navigate('/notifications')} aria-label={unread ? `${unread} unread notifications` : 'Notifications'}>
          <Bell size={18} color="#475569" />
          {unread > 0 && <span className="absolute -top-1 -right-1 bg-[#408A71] text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center tabular-nums">{unread}</span>}
        </button>
        <div className="flex items-center gap-2.5 pl-1">
          <span className="w-9 h-9 rounded-full bg-[#B0E4CC] text-[#285A48] hidden sm:flex items-center justify-center text-xs font-bold shrink-0" aria-hidden>{initials}</span>
          <div className="text-right hidden sm:block"><p className="text-sm font-semibold leading-tight">{displayUser?.name}</p><p className="text-[11px] text-slate-400">{displayUser?.role}</p></div>
        </div>
      </div>
    </header>
  );
}
