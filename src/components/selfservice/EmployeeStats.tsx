import { Users, Receipt } from 'lucide-react';

function Spark({ points, color, fill }: { points: number[]; color: string; fill: string }) {
  const W = 96; const H = 36;
  if (!points.length) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...points, 1); const min = Math.min(...points, 0);
  const span = max - min || 1;
  const pts = points.map((v, i) => {
    const x = (i / Math.max(1, points.length - 1)) * W;
    const y = H - 4 - ((v - min) / span) * (H - 10);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg width={W} height={H} className="block overflow-visible" aria-hidden>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 1 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />}
    </svg>
  );
}

export default function EmployeeStats({ attendance, payroll }: { attendance: any[]; payroll: any[] }) {
  const totalAtt = attendance.length;
  const totalSlips = payroll.length;
  const present = attendance.filter((r: any) => r.status === 'Present').length;
  const late = attendance.filter((r: any) => r.status === 'Late').length;
  const processed = payroll.filter((r: any) => r.status === 'Processed').length;

  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthAtt = attendance.filter((r: any) => typeof r.date === 'string' && r.date.startsWith(prefix)).length;

  const attSpark = attendance.slice(-12).map((r: any) => Number(r.hours) || 0);
  const slipSpark = payroll.slice(-12).map((r: any) => Number(r.daysWorked) || 0);

  const cards = [
    {
      label: 'Total Attendance',
      value: String(totalAtt),
      sub: `${present} present · ${late} late`,
      meta: `+${monthAtt} this month`,
      icon: <Users size={17} className="text-[#285A48]" />,
      chip: 'bg-[#B0E4CC]',
      stripe: 'bg-[#408A71]',
      spark: <Spark points={attSpark.length ? attSpark : [0]} color="#408A71" fill="rgba(64,138,113,0.14)" />,
      well: 'bg-[#EFF7F2] border-[#B0E4CC]',
    },
    {
      label: 'Total Payslips',
      value: String(totalSlips),
      sub: `${processed} processed`,
      meta: totalSlips ? 'Ready to view' : 'No slips yet',
      icon: <Receipt size={17} className="text-amber-800" />,
      chip: 'bg-amber-100',
      stripe: 'bg-amber-500',
      spark: <Spark points={slipSpark.length ? slipSpark : [0]} color="#d97706" fill="rgba(217,119,6,0.12)" />,
      well: 'bg-amber-50 border-amber-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
      {cards.map(c => (
        <div key={c.label} className="card p-0 h-[112px] min-h-[112px] max-h-[112px] flex items-stretch overflow-hidden">
          <div className={`w-1.5 shrink-0 ${c.stripe}`} aria-hidden />
          <div className="flex-1 min-w-0 p-4 flex items-center gap-4">
            <span className={`w-11 h-11 rounded-2xl ${c.chip} flex items-center justify-center shrink-0`}>{c.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-xs text-slate-500 truncate">{c.label}</p>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 whitespace-nowrap">{c.meta}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-[28px] leading-none font-extrabold tracking-tight tabular-nums">{c.value}</p>
                <p className="text-xs text-slate-400 truncate">{c.sub}</p>
              </div>
            </div>
            <div className={`shrink-0 rounded-xl border ${c.well} px-2.5 py-1.5 flex items-center h-[52px]`}>
              {c.spark}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
