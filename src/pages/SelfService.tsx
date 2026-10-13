import { useState } from 'react';
import { getDB, empName } from '../data/mock';
import PayslipModal from '../components/payroll/Payslip';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/bits';
import AttendanceCalendar from '../components/selfservice/AttendanceCalendar';
import TodayAttendance from '../components/selfservice/TodayAttendance';
import MonthlyTarget from '../components/selfservice/MonthlyTarget';
import EmployeeStats from '../components/selfservice/EmployeeStats';

export default function SelfService() {
  const { user } = useAuth();
  const [v, setV] = useState(0);
  const db = getDB();
  void v;
  const me = db.employees.find((e: any) => e.name === user?.name) ?? db.employees.find((e: any) => e.email === (user as any)?.email) ?? null;
  if (!me) return <div className="card p-6 text-sm text-slate-500">No employee record linked to this account.</div>;

  const myAtt = (db.attendance ?? []).filter((a: any) => a.empId === me.id);
  const myPay = (db.payrollRecords ?? []).filter((r: any) => r.empId === me.id);
  const count = (s: string) => myAtt.filter((a: any) => a.status === s).length;
  const myLeaves = (db.leaveRequests ?? []).filter((l: any) => l.empId === me.id);
  const vacation = (db.leaveTypes ?? []).find((t: any) => t.id === 1) ?? { credits: 0 };
  const used = myLeaves.filter((l: any) => l.typeId === 1 && l.status === 'Approved').reduce((s: number, l: any) => s + l.days, 0);
  const [slip, setSlip] = useState<number | null>(null);
  const navigate = useNavigate();

  const stats: [string, any, string][] = [
    ['Days Present', count('Present'), 'text-emerald-600'],
    ['Late', count('Late'), 'text-amber-600'],
    ['Absent', count('Absent'), 'text-red-600'],
    ['Leave', count('On Leave'), 'text-blue-600'],
    ['Overtime', myAtt.reduce((s: number, a: any) => s + (Number(a.overtime) || 0), 0).toFixed(1) + ' hrs', 'text-indigo-600'],
    ['Total Hours', Math.round(myAtt.reduce((s: number, a: any) => s + (Number(a.hours) || 0), 0) * 100) / 100, 'text-slate-800'],
  ];

  return (
    <div className="space-y-4">
      <EmployeeStats attendance={myAtt} payroll={myPay} />

      <div className="grid lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-2 h-full"><TodayAttendance empId={me.id} onChange={() => setV(x => x + 1)} /></div>
        <div className="lg:col-span-3 h-full"><MonthlyTarget empId={me.id} records={db.attendance ?? []} /></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 h-full"><AttendanceCalendar empId={me.id} records={db.attendance ?? []} /></div>
        <div className="h-full">
          <div className="card-flat p-5 h-full flex flex-col">
            <h3 className="font-bold text-sm mb-3">Monthly Summary</h3>
            {stats.map(([l, val, c]) => <div key={l} className="flex justify-between py-2 border-b border-slate-50 last:border-0"><span className="text-sm text-slate-500">{l}</span><b className={c}>{val}</b></div>)}
            <h3 className="font-bold text-sm mt-5 mb-2">Leave Balance</h3>
            <div className="flex justify-between text-sm"><span>Vacation Leave</span><b>{Math.max(0, vacation.credits - used)} / {vacation.credits} days</b></div>
            <div className="grid grid-cols-2 gap-2 mt-auto pt-4">
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/leave')}>Request Leave</button>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/overtime')}>Request Overtime</button>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/corrections')}>Correct Time</button>
              <button className="btn btn-outline btn-sm" onClick={() => setSlip(me.id)}>View Payslip</button>
              <button className="btn btn-outline btn-sm col-span-2" onClick={() => navigate('/attendance')}>View Attendance</button>
            </div>
          </div>
        </div>
      </div>

      {slip && <PayslipModal empId={slip} onClose={() => setSlip(null)} />}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-bold text-sm mb-3">My Requests</h3>
          {(() => {
            const mine = [
              ...(db.leaveRequests ?? []).filter((l: any) => l.empId === me.id).map((l: any) => ({ label: `Leave · ${(db.leaveTypes ?? []).find((t: any) => t.id === l.typeId)?.name ?? ''}`, status: l.status })),
              ...(db.overtimeRequests ?? []).filter((o: any) => o.empId === me.id).map((o: any) => ({ label: `Overtime · ${Number(o.hours).toFixed(1)}h`, status: o.status })),
              ...(db.correctionRequests ?? []).filter((c: any) => c.empId === me.id).map((c: any) => ({ label: `Correction · ${c.requestedTime}`, status: c.status })),
              ...(db.loans ?? []).filter((l: any) => l.empId === me.id).map((l: any) => ({ label: `${l.type} · ${l.status}`, status: l.status })),
              ...(db.expenses ?? []).filter((e: any) => e.empId === me.id).map((e: any) => ({ label: `Expense · ${e.category}`, status: e.status })),
              ...(db.hrRequests ?? []).filter((r: any) => r.empId === me.id).map((r: any) => ({ label: `${r.type}`, status: r.status })),
            ].slice(-6).reverse();
            if (!mine.length) return <p className="text-sm text-slate-400">No requests yet.</p>;
            return mine.map((m: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"><span className="text-sm truncate">{m.label}</span><Badge status={m.status} /></div>
            ));
          })()}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/leave')}>Leave</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/loans')}>Loans</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/requests')}>HR Requests</button>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-bold text-sm mb-3">My Payroll & Documents</h3>
          {myPay.slice(-3).reverse().map((r: any) => {
            const p = (db.payrollPeriods ?? []).find((x: any) => x.id === r.periodId);
            return <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0"><span className="text-sm">{p?.label ?? `#${r.periodId}`} · <b className="tabular-nums">{r.net.toLocaleString()}</b></span><button className="btn btn-outline btn-sm" onClick={() => setSlip(me.id)}>Payslip</button></div>;
          })}
          {!myPay.length && <p className="text-sm text-slate-400">No payslips yet.</p>}
          <h3 className="font-bold text-sm mt-4 mb-2">Announcements</h3>
          {((db.announcements ?? []).slice(-2).reverse() as any[]).map((a: any) => <p key={a.id} className="text-sm py-1"><b>{a.title}:</b> <span className="text-slate-500">{String(a.body).slice(0, 90)}</span></p>)}
          <button className="btn btn-outline btn-sm mt-3" onClick={() => navigate('/documents')}>My Documents ({(db.documents ?? []).filter((d: any) => d.empId === me.id).length})</button>
          <span className="text-xs text-slate-400 ml-2">{empName(db, me.id) ? '' : ''}</span>
        </div>
      </div>
    </div>
  );
}
