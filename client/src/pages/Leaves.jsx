import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { getAccess } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatDate } from '../lib/format';
import { differenceInCalendarDays } from 'date-fns';
import api from '../api/client';

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Compensatory', 'Unpaid'];
const empty = { type: 'Casual', from: '', to: '', reason: '' };

export default function Leaves() {
  const { user } = useAuth();
  const access = getAccess('leaves', user.role);
  const canApprove = access === 'team' || access === true;
  const { data, loading, refetch } = useFetch('/leaves', []);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const apply = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const days = Math.max(1, differenceInCalendarDays(new Date(form.to), new Date(form.from)) + 1);
      await api.post('/leaves', { ...form, days });
      setModal(false); setForm(empty); refetch();
    } catch (err) { setError(err.message); }
  };

  const setStatus = async (id, status) => {
    await api.patch(`/leaves/${id}/status`, { status });
    refetch();
  };

  if (loading) return <Loading />;
  const leaves = data || [];
  const pending = leaves.filter((l) => l.status === 'Pending').length;

  return (
    <div>
      <PageHeader title="Leaves" subtitle={canApprove ? `${pending} pending request(s)` : 'Apply and track your leaves'}>
        <button onClick={() => { setForm(empty); setError(''); setModal(true); }} className="btn-primary"><Plus size={18} /> Apply Leave</button>
      </PageHeader>

      {leaves.length === 0 ? (
        <EmptyState title="No leave requests" hint="Apply for leave to get started." />
      ) : (
        <Table columns={[canApprove ? 'Employee' : null, 'Type', 'From', 'To', 'Days', 'Reason', 'Status', canApprove ? 'Action' : null].filter((c) => c !== null)}>
          {leaves.map((l) => (
            <tr key={l._id} className="hover:bg-gray-50">
              {canApprove && (
                <td className="td"><div className="flex items-center gap-2"><Avatar name={l.employee?.name} size={30} /><span className="font-medium text-gray-900">{l.employee?.name}</span></div></td>
              )}
              <td className="td">{l.type}</td>
              <td className="td">{formatDate(l.from)}</td>
              <td className="td">{formatDate(l.to)}</td>
              <td className="td">{l.days}</td>
              <td className="td max-w-[200px] truncate">{l.reason || '—'}</td>
              <td className="td"><Badge status={l.status} /></td>
              {canApprove && (
                <td className="td">
                  {l.status === 'Pending' ? (
                    <div className="flex gap-1">
                      <button onClick={() => setStatus(l._id, 'Approved')} className="btn-ghost btn-sm text-green-600"><Check size={15} /></button>
                      <button onClick={() => setStatus(l._id, 'Rejected')} className="btn-ghost btn-sm text-red-600"><X size={15} /></button>
                    </div>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Apply for Leave"
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button form="leave-form" className="btn-primary">Submit</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="leave-form" onSubmit={apply} className="space-y-3">
          <div><label className="label">Leave Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">From</label><input type="date" required className="input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></div>
            <div><label className="label">To</label><input type="date" required className="input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div>
          </div>
          <div><label className="label">Reason</label><textarea className="input" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
