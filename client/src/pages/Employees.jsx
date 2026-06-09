import { useState } from 'react';
import { Plus, Pencil, UserX, Search } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite, ROLES, ROLE_LABELS } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/format';
import api from '../api/client';

const empty = { name: '', email: '', role: 'web_developer', department: '', phone: '', salary: 0, status: 'Active', reportingManager: '' };

export default function Employees() {
  const { user } = useAuth();
  const writable = canWrite('employees', user.role);
  const { data, loading, refetch } = useFetch('/employees', []);
  const managers = useUserOptions();
  const [modal, setModal] = useState(null); // { mode, employee }
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const open = (employee) => {
    setError('');
    if (employee) {
      setForm({ ...empty, ...employee, reportingManager: employee.reportingManager?._id || '', joinDate: employee.joinDate?.slice(0, 10) });
      setModal({ mode: 'edit', id: employee._id });
    } else {
      setForm(empty);
      setModal({ mode: 'create' });
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...form, reportingManager: form.reportingManager || null };
      if (modal.mode === 'create') await api.post('/employees', payload);
      else await api.put(`/employees/${modal.id}`, payload);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.message);
    }
  };

  const deactivate = async (id) => {
    if (!confirm('Deactivate this employee? They will no longer be able to log in.')) return;
    await api.delete(`/employees/${id}`);
    refetch();
  };

  if (loading) return <Loading />;
  const list = (data || []).filter((u) =>
    [u.name, u.email, u.department].join(' ').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Employees" subtitle="Company directory, roles & reporting lines">
        {writable && (
          <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> Add Employee</button>
        )}
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input className="input pl-10" placeholder="Search employees…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState title="No employees found" />
      ) : (
        <Table columns={['Employee', 'Role', 'Department', 'Manager', 'Salary', 'Joined', 'Status', writable ? '' : null].filter((c) => c !== null)}>
          {list.map((u) => (
            <tr key={u._id} className="hover:bg-gray-50">
              <td className="td">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div>
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="td">{ROLE_LABELS[u.role]}</td>
              <td className="td">{u.department}</td>
              <td className="td">{u.reportingManager?.name || '—'}</td>
              <td className="td">{formatCurrency(u.salary)}</td>
              <td className="td">{formatDate(u.joinDate)}</td>
              <td className="td"><Badge status={u.status} /></td>
              {writable && (
                <td className="td">
                  <div className="flex gap-1">
                    <button onClick={() => open(u)} className="btn-ghost btn-sm"><Pencil size={15} /></button>
                    {u.status !== 'Inactive' && (
                      <button onClick={() => deactivate(u._id)} className="btn-ghost btn-sm text-red-600"><UserX size={15} /></button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Add Employee' : 'Edit Employee'}
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button form="emp-form" className="btn-primary">Save</button>
        </>}
      >
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="emp-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div><label className="label">Department</label><input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Salary (₹/mo)</label><input type="number" className="input" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></div>
          <div><label className="label">Reporting Manager</label>
            <select className="input" value={form.reportingManager} onChange={(e) => setForm({ ...form, reportingManager: e.target.value })}>
              <option value="">— None —</option>
              {managers.filter((m) => m._id !== modal?.id).map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {['Active', 'On Leave', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          {modal?.mode === 'create' && (
            <div className="sm:col-span-2"><label className="label">Temporary Password</label>
              <input className="input" placeholder="Default: gpsfdk123" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          )}
        </form>
      </Modal>
    </div>
  );
}
