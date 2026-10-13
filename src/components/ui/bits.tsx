export function toast(msg: string) {
  const existing = document.querySelectorAll('.toast');
  if (existing.length >= 3) existing[0].remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  t.setAttribute('role', 'status');
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

const initials = (n?: string) => (n ?? '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '—';
export const Avatar = ({ name }: { name?: string }) => (
  <span className="inline-flex w-8 h-8 rounded-full bg-[#B0E4CC] text-[#285A48] items-center justify-center text-xs font-bold shrink-0" aria-hidden>{initials(name)}</span>
);

export function Badge({ status }: { status: string }) {
  const map: Record<string, string> = { Present: 'badge-green', Late: 'badge-amber', Absent: 'badge-red', 'Half Day': 'badge-amber', 'On Leave': 'badge-blue', 'Rest Day': 'badge-gray', Holiday: 'badge-indigo', Active: 'badge-green', Archived: 'badge-gray', Pending: 'badge-amber', Approved: 'badge-green', Rejected: 'badge-red', Cancelled: 'badge-gray', Processed: 'badge-green', Draft: 'badge-amber' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return toast('No data to export');
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k]).replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename + '.csv'; a.click();
  toast('CSV exported');
}
