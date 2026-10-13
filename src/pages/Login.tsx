import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/ui/bits';
import { getDB } from '../data/mock';

export default function Login() {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('admin@sunrisedigital.ph');
  const [pass, setPass] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) navigate(user.role === 'Employee' ? '/self-service' : '/dashboard', { replace: true });
  }, [user]);

  const doLogin = async () => {
    const em = email.trim();
    if (await login(em, pass)) {
      setLoading(true);
      const role = getDB().users.find((u: any) => String(u.email).toLowerCase() === em.toLowerCase() && u.pass === pass)?.role;
      setTimeout(() => navigate(role === 'Employee' ? '/self-service' : '/dashboard', { replace: true }), 1200);
    } else {
      toast('Invalid credentials');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#091413] flex flex-col items-center justify-center gap-8">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-[#408A71] animate-[loginPulse_1.6s_ease-in-out_infinite]"></div>
          <div className="absolute inset-0 rounded-2xl bg-[#408A71]/40 animate-[loginPulse_1.6s_ease-in-out_infinite] [animation-delay:.4s]"></div>
          <div className="relative w-16 h-16 rounded-2xl bg-[#408A71] flex items-center justify-center text-white"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        </div>
        <div className="flex items-end gap-1.5 h-8">
          {[0,1,2,3,4].map(i => (
            <span key={i} className="w-1.5 rounded-full bg-[#B0E4CC] animate-[loginBar_1s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.12}s`, height: '100%' }}></span>
          ))}
        </div>
        <p className="text-[#B0E4CC]/80 text-sm tracking-widest uppercase animate-pulse">Signing you in</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f6f9f7]">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[#091413] text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-[#408A71]/20 blur-3xl"></div>
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-[#408A71]/10 blur-3xl"></div>
        <div className="flex items-center gap-2.5 relative">
          <div className="w-10 h-10 rounded-xl bg-[#408A71] flex items-center justify-center text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <span className="text-lg font-bold tracking-tight">HR Management Dashboard</span>
        </div>
        <div className="relative">
          <h1 className="display text-4xl font-bold leading-tight tracking-tight">Time in.<br />Pay out.<br />Sleep easy.</h1>
          <p className="text-slate-400 mt-4 max-w-sm text-sm leading-relaxed">Attendance, leave, and Philippine payroll in one place — built for businesses that count every peso.</p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-sm">
            {[['128', 'Employees'], ['99.9%', 'Uptime'], ['₱0', 'Payroll errors']].map(([v, l]) => (
              <div key={l}><p className="text-2xl font-bold">{v}</p><p className="text-slate-500">{l}</p></div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600 relative">© 2026 HR Management Dashboard · Taguig City, Philippines</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#408A71] text-white flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <span className="text-lg font-bold">HR Management Dashboard</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in to your workspace, or create one below.</p>

          <div className="flex border-b border-slate-200 mt-6 mb-6">
            {(['login', 'register', 'forgot'] as const).map(t => (
              <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'login' ? 'Login' : t === 'register' ? 'Register' : 'Forgot'}
              </button>
            ))}
          </div>

          <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.985 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
          {tab === 'login' && (
            <form onSubmit={e => { e.preventDefault(); doLogin(); }}>
              <label className="flabel">Work email</label><input value={email} onChange={e => setEmail(e.target.value)} className="mb-4" autoComplete="email" />
              <label className="flabel">Password</label><input type="password" value={pass} onChange={e => setPass(e.target.value)} className="mb-2" autoComplete="current-password" />
              <div className="text-right mb-5"><button type="button" className="text-xs text-[#285A48] font-semibold" onClick={() => setTab('forgot')}>Forgot password?</button></div>
              <button type="submit" className="btn btn-primary w-full !py-3 text-sm">Sign in</button>
              <p className="text-center text-xs text-slate-400 mt-5">Demo: admin@sunrisedigital.ph / admin123</p>
            </form>
          )}
          {tab === 'register' && (
            <>
              <label className="flabel">Company name</label><input className="mb-4" placeholder="Your Company Inc." />
              <label className="flabel">Work email</label><input className="mb-4" placeholder="you@company.com" />
              <label className="flabel">Password</label><input type="password" className="mb-5" placeholder="••••••••" />
              <button className="btn btn-primary w-full !py-3 text-sm" onClick={() => toast('Verification email sent — check your inbox')}>Create workspace</button>
            </>
          )}
          {tab === 'forgot' && (
            <>
              <label className="flabel">Work email</label><input className="mb-5" placeholder="you@company.com" />
              <button className="btn btn-primary w-full !py-3 text-sm" onClick={() => toast('Reset link sent. Check your email.')}>Send reset link</button>
            </>
          )}
          </motion.div>
          </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
