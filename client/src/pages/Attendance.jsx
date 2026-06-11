import { useState, useEffect } from 'react';
import { LogIn, LogOut, Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { getAccess } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar, StatCard } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatDate } from '../lib/format';
import api from '../api/client';

const STATUSES = ['Present', 'Late', 'Absent'];
const emptyRec = { employee: '', date: '', checkIn: '', checkOut: '', status: 'Present', hoursWorked: 0 };

// Live HH:MM:SS counter for the current open session (since today's check-in).
function SessionTimer({ checkIn }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!checkIn) return null;
  const [h, m] = checkIn.split(':').map(Number);
  const start = new Date();
  start.setHours(h, m, 0, 0);
  const secs = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <span className="font-mono font-semibold tabular-nums">
      {pad(Math.floor(secs / 3600))}:{pad(Math.floor((secs % 3600) / 60))}:{pad(secs % 60)}
    </span>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const access = getAccess('attendance', user.role);
  const teamView = access === 'team' || access === true;
  const isAdmin = user.role === 'super_admin'; // full timing control
  const { data, loading, refetch } = useFetch('/attendance', []);
  const users = useUserOptions();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { id } | { id: null }
  const [form, setForm] = useState(emptyRec);
  const [error, setError] = useState('');

  const act = async (kind) => {
    setBusy(true); setMsg('');
    try {
      await api.post(`/attendance/${kind}`);
      setMsg(kind === 'checkin' ? '✅ Checked in successfully' : '✅ Checked out successfully');
      window.dispatchEvent(new Event('attendance-changed')); // refresh the heartbeat tracker
      refetch();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Refresh the list periodically (and on clock in/out elsewhere) so an
  // auto-clock-out from a closed session is reflected here.
  useEffect(() => {
    const id = setInterval(refetch, 30000);
    window.addEventListener('attendance-changed', refetch);
    return () => { clearInterval(id); window.removeEventListener('attendance-changed', refetch); };
  }, [refetch]);

  const openRec = (rec) => {
    setError('');
    if (rec) {
      setForm({ employee: rec.employee?._id || rec.employee || '', date: rec.date?.slice(0, 10), checkIn: rec.checkIn || '', checkOut: rec.checkOut || '', status: rec.status, hoursWorked: rec.hoursWorked || 0 });
      setModal({ id: rec._id });
    } else {
      setForm({ ...emptyRec, date: new Date().toISOString().slice(0, 10) });
      setModal({ id: null });
    }
  };

  // Compute worked hours from check-in/out (handles overnight).
  const computeHours = (ci, co) => {
    if (!ci || !co) return form.hoursWorked;
    const [h1, m1] = ci.split(':').map(Number);
    const [h2, m2] = co.split(':').map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  };
  // Update a time field and auto-fill hours from the resulting in/out pair.
  const setTime = (field, val) => {
    const ci = field === 'checkIn' ? val : form.checkIn;
    const co = field === 'checkOut' ? val : form.checkOut;
    setForm({ ...form, [field]: val, hoursWorked: computeHours(ci, co) });
  };

  const saveRec = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (modal.id) await api.put(`/attendance/${modal.id}`, form);
      else await api.post('/attendance', form);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };

  const removeRec = async (id) => {
    if (!confirm('Delete this attendance record?')) return;
    await api.delete(`/attendance/${id}`); refetch();
  };

  if (loading) return <Loading />;
  const records = data || [];
  const today = new Date().toDateString();
  const mine = records.filter((r) => String(r.employee?._id || r.employee) === String(user._id));
  const todayRec = mine.find((r) => new Date(r.date).toDateString() === today);

  const present = records.filter((r) => r.status === 'Present').length;
  const late = records.filter((r) => r.status === 'Late').length;
  const absent = records.filter((r) => r.status === 'Absent').length;

  return (
    <div>
      <PageHeader title="Attendance" subtitle={isAdmin ? 'Manage and correct any employee’s timings' : teamView ? 'Team attendance & summaries' : 'Your check-in / check-out history'}>
        <div className="flex flex-wrap gap-2">
          {isAdmin && <button onClick={() => openRec(null)} className="btn-secondary"><Plus size={18} /> Add Record</button>}
          <button onClick={() => act('checkin')} disabled={busy || todayRec?.clockedIn} className="btn-primary">
            <LogIn size={18} /> Check In
          </button>
          <button onClick={() => act('checkout')} disabled={busy || !todayRec?.clockedIn} className="btn-secondary">
            <LogOut size={18} /> Check Out
          </button>
        </div>
      </PageHeader>

      {todayRec?.clockedIn && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
          </span>
          On the clock since {todayRec.sessionStart || todayRec.checkIn} · <SessionTimer checkIn={todayRec.sessionStart || todayRec.checkIn} />
          <span className="text-brand-600/70">— closing the app clocks you out automatically</span>
        </div>
      )}

      {msg && <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{msg}</div>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={todayRec ? todayRec.status : 'Not marked'} icon={Clock} hint={todayRec?.checkIn ? `In ${todayRec.checkIn}${todayRec.checkOut ? ` · Out ${todayRec.checkOut}` : ''}` : `Shift ${user.shiftStart || '09:30'}–${user.shiftEnd || '18:30'}`} />
        <StatCard label="Present" value={present} icon={Clock} accent="green" />
        <StatCard label="Late" value={late} icon={Clock} accent="amber" />
        <StatCard label="Absent" value={absent} icon={Clock} accent="red" />
      </div>

      {records.length === 0 ? (
        <EmptyState title="No attendance records" hint="Check in to create your first record." />
      ) : (
        <Table columns={[teamView ? 'Employee' : null, 'Date', 'Check In', 'Check Out', 'Hours', 'Status', isAdmin ? '' : null].filter((c) => c !== null)}>
          {records.map((r) => (
            <tr key={r._id} className="hover:bg-gray-50">
              {teamView && (
                <td className="td">
                  <div className="flex items-center gap-2"><Avatar name={r.employee?.name} size={30} /><span className="font-medium text-gray-900">{r.employee?.name}</span></div>
                </td>
              )}
              <td className="td">{formatDate(r.date)}</td>
              <td className="td">{r.checkIn || '—'}</td>
              <td className="td">
                {r.checkOut ? (
                  r.checkOut
                ) : r.clockedIn ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                    </span>
                    Active
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="td">{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
              <td className="td"><Badge status={r.status} /></td>
              {isAdmin && (
                <td className="td">
                  <div className="flex gap-1">
                    <button onClick={() => openRec(r)} className="btn-ghost btn-sm"><Pencil size={15} /></button>
                    <button onClick={() => removeRec(r._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {/* Super-admin add/edit record */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Attendance' : 'Add Attendance Record'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="att-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="att-form" onSubmit={saveRec} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Employee</label>
            <select required className="input" value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} disabled={!!modal?.id}>
              <option value="">— Select employee —</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} · {u.department}</option>)}
            </select>
          </div>
          <div><label className="label">Date</label><input type="date" required className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Check In</label><input type="time" className="input" value={form.checkIn} onChange={(e) => setTime('checkIn', e.target.value)} /></div>
          <div><label className="label">Check Out</label><input type="time" className="input" value={form.checkOut} onChange={(e) => setTime('checkOut', e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="label">Hours Worked <span className="font-normal text-gray-400">(auto-filled from times — editable)</span></label><input type="number" step="0.1" className="input" value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: Number(e.target.value) })} /></div>
        </form>
      </Modal>
    </div>
  );
}
