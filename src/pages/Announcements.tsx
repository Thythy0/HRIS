import { useState } from 'react';
import { getDB, saveDB, fmtDate } from '../data/mock';
import { Badge, toast } from '../components/ui/bits';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { pushRow } from '../lib/sync';
import { activeAnnouncements } from '../lib/experience';
import { logAudit } from '../lib/audit';

export default function Announcements() {
  const { user } = useAuth();
  const [db, setDb] = useState(getDB());
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ title: '', body: '', expires: '' });
  const canPost = user?.role === 'Super Admin' || user?.role === 'HR/Admin' || user?.role === 'Manager';
  const list = activeAnnouncements(db, user);
  const refresh = () => setDb({ ...getDB() });

  const post = () => {
    if (!form.title || !form.body) return toast('Title and body required');
    const d = getDB();
    const rec = { id: Date.now(), title: form.title, body: form.body, audience: 'All', dept: null, published: new Date().toISOString().slice(0, 10), expires: form.expires || '', by: user?.name ?? '' };
    d.announcements.push(rec);
    d.notifications.unshift({ id: Date.now(), text: `Announcement: ${rec.title}`, time: 'now', unread: true });
    saveDB(d); pushRow('announcements', rec); logAudit('Announcement posted', 'Announcements', rec.title);
    setShow(false); refresh(); toast('Announcement published');
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        <span className="badge badge-blue">{list.length} active</span>
        <div className="flex-1" />
        {canPost && <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ New Announcement</button>}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((a: any) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-center gap-2 mb-1"><h3 className="font-bold text-sm">{a.title}</h3><span className="ml-auto"><Badge status="Active" /></span></div>
            <p className="text-[11px] text-slate-400 mb-3">{a.by} · {fmtDate(a.published)}{a.expires ? ` → ${fmtDate(a.expires)}` : ''}</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
          </div>
        ))}
        {!list.length && <div className="card p-6 text-sm text-slate-400 md:col-span-2">No active announcements.</div>}
      </div>
      {show && (
        <Modal size="sm" onClose={() => setShow(false)}>
          <h3 className="font-bold mb-4">New Announcement</h3>
          <label className="flabel">Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <label className="flabel mt-3">Body</label><textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <label className="flabel mt-3">Expires (optional)</label><input type="date" value={form.expires} onChange={e => setForm({ ...form, expires: e.target.value })} />
          <div className="flex justify-end gap-2 mt-5"><button className="btn btn-outline" onClick={() => setShow(false)}>Cancel</button><button className="btn btn-primary" onClick={post}>Publish</button></div>
        </Modal>
      )}
    </>
  );
}
