import React, { useState } from 'react';
import { getDB, saveDB, deptName } from '../data/mock';
import { toast } from '../components/ui/bits';

export default function Positions() {
  const [db, setDb] = useState(getDB());
  const add = () => {
    const n = prompt('Position name:');
    if (!n) return;
    const d = getDB();
    d.positions.push({ id: Date.now(), name: n, dept: 1 });
    saveDB(d); setDb({ ...getDB() }); toast('Position added');
  };
  const del = (id: number) => {
    const d = getDB();
    d.positions = d.positions.filter((p: any) => p.id !== id);
    saveDB(d); setDb({ ...getDB() }); toast('Position removed');
  };
  return (
    <>
      <div className="card p-4 mb-4 flex justify-between"><h3 className="font-bold text-sm">Positions</h3><button className="btn btn-primary btn-sm" onClick={add}>+ Add Position</button></div>
      <div className="card overflow-x-auto"><table><thead><tr><th>Position</th><th>Department</th><th>Headcount</th><th></th></tr></thead>
        <tbody>{db.positions.map((p: any) => (
          <tr key={p.id}><td className="font-medium">{p.name}</td><td>{deptName(db, p.dept)}</td><td>{db.employees.filter((e: any) => e.position === p.id).length}</td><td><button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>Delete</button></td></tr>
        ))}</tbody></table></div>
    </>
  );
}
