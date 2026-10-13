import React, { useState } from 'react';
import { getDB, saveDB } from '../data/mock';
import { toast } from '../components/ui/bits';

export default function Departments() {
  const [db, setDb] = useState(getDB());
  const add = () => { const n = prompt('Department name:'); if (!n) return; const d = getDB(); d.departments.push({ id: Date.now(), name: n }); saveDB(d); setDb({ ...getDB() }); toast('Department added'); };
  const del = (id: number) => { const d = getDB(); d.departments = d.departments.filter((x: any) => x.id !== id); saveDB(d); setDb({ ...getDB() }); toast('Removed'); };
  return (
    <>
      <div className="card p-4 mb-4 flex justify-between"><h3 className="font-bold text-sm">Departments</h3><button className="btn btn-primary btn-sm" onClick={add}>+ Add Department</button></div>
      <div className="grid md:grid-cols-3 gap-4">{db.departments.map((d: any) => (
        <div key={d.id} className="card p-5 flex justify-between items-center">
          <div><h4 className="font-bold">{d.name}</h4><p className="text-xs text-slate-400 mt-1">{db.employees.filter((e: any) => e.dept === d.id).length} employees</p></div>
          <button className="btn btn-danger btn-sm" onClick={() => del(d.id)}>Delete</button>
        </div>
      ))}</div>
    </>
  );
}
