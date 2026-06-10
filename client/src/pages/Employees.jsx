import { useState } from 'react';
import { Plus, Pencil, UserX, Trash2, Search, Mail, Copy, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite, ROLES, ROLE_LABELS } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/format';
import api from '../api/client';

const empty = {
  name: '', email: '', role: 'web_developer', department: '', phone: '', salary: 0,
  status: 'Active', reportingManager: '', shiftStart: '09:30', shiftEnd: '18:30', password: '',
};

export default function Employees() {
  const { user } = useAuth();
  const writable = canWrite('employees', user.role);
  const { data, loading, refetch } = useFetch('/employees', []);
  const managers = useUserOptions();
  const [modal, setModal] = useState(null); // { mode, id }
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [result, setResult] = useState(null); // credentials result after create
  const [copied, setCopied] = useState(false);

  const open = (employee) => {
    setError('');
    if (employee) {
      setForm({ ...empty, ...employee, reportingManager: employee.reportingManager?._id || '', joinDate: employee.joinDate?.slice(0, 10), password: '' });
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
      if (modal.mode === 'create') {
        const res = await api.post('/employees', payload);
        setModal(null);
        setResult(res.data); // { employee, credentials, email }
        setCopied(false);
      } else {
        await api.put(`/employees/${modal.id}`, payload);
        setModal(null);
      }
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

  const permanentDelete = async (id, name) => {
    if (!confirm(`Permanently delete ${name}? This removes the record for good and cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${id}/permanent`);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyCreds = () => {
    const c = result.credentials;
    navigator.clipboard?.writeText(`Login: ${c.email}\nPassword: ${c.tempPassword}\nEmployee ID: ${c.employeeId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <Loading />;
  const list = (data || []).filter((u) =>
    [u.name, u.email, u.department, u.employeeId].join(' ').toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Employees" subtitle="Create accounts, assign roles, set shift timings">
        {writable && (
          <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> Create Account</button>
        )}
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input className="input pl-10" placeholder="Search employees…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <EmptyState title="No employees found" />
      ) : (
        <Table columns={['Employee', 'Role', 'Department', 'Shift', 'Salary', 'Status', writable ? '' : null].filter((c) => c !== null)}>
          {list.map((u) => (
            <tr key={u._id} className="hover:bg-gray-50">
              <td className="td">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} />
                  <div>
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}{u.employeeId ? ` · ${u.employeeId}` : ''}</p>
                  </div>
                </div>
              </td>
              <td className="td">{ROLE_LABELS[u.role]}</td>
              <td className="td">{u.department}</td>
              <td className="td whitespace-nowrap text-xs"><Clock size={12} className="mr-1 inline text-gray-400" />{u.shiftStart || '09:30'}–{u.shiftEnd || '18:30'}</td>
              <td className="td">{formatCurrency(u.salary)}</td>
              <td className="td"><Badge status={u.status} /></td>
              {writable && (
                <td className="td">
                  <div className="flex gap-1">
                    <button title="Edit" onClick={() => open(u)} className="btn-ghost btn-sm"><Pencil size={15} /></button>
                    {u.status !== 'Inactive' ? (
                      <button title="Deactivate" onClick={() => deactivate(u._id)} className="btn-ghost btn-sm text-red-600"><UserX size={15} /></button>
                    ) : (
                      <button title="Delete permanently" onClick={() => permanentDelete(u._id, u.name)} className="btn-ghost btn-sm text-red-600"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {/* Create / edit form */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        size="lg"
        title={modal?.mode === 'create' ? 'Create User Account' : 'Edit Employee'}
        footer={<>
          <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
          <button form="emp-form" className="btn-primary">{modal?.mode === 'create' ? 'Create & Email Credentials' : 'Save'}</button>
        </>}
      >
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="emp-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={modal?.mode === 'edit'} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div><label className="label">Department</label><input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Salary (₹/mo)</label><input type="number" className="input" value={form.salary} onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })} /></div>
          <div><label className="label">Shift Start</label><input type="time" className="input" value={form.shiftStart} onChange={(e) => setForm({ ...form, shiftStart: e.target.value })} /></div>
          <div><label className="label">Shift End</label><input type="time" className="input" value={form.shiftEnd} onChange={(e) => setForm({ ...form, shiftEnd: e.target.value })} /></div>
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
          {modal?.mode === 'create' ? (
            <div className="sm:col-span-2">
              <label className="label">Demo Password <span className="font-normal text-gray-400">(optional)</span></label>
              <input className="input" placeholder="Leave blank to auto-generate a secure password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><Mail size={13} /> The Employee ID, login email and password will be emailed to the user automatically.</p>
            </div>
          ) : (
            <div className="sm:col-span-2"><label className="label">Reset Password <span className="font-normal text-gray-400">(optional)</span></label>
              <input className="input" placeholder="Leave blank to keep current password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          )}
        </form>
      </Modal>

      {/* Credentials result */}
      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title="Account created"
        footer={<>
          <button onClick={copyCreds} className="btn-secondary">{copied ? <><CheckCircle2 size={16} /> Copied</> : <><Copy size={16} /> Copy credentials</>}</button>
          <button onClick={() => setResult(null)} className="btn-primary">Done</button>
        </>}
      >
        {result && (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 size={18} /> Account for <b>{result.employee.name}</b> is ready.
            </div>
            <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Employee ID</span><span className="font-mono font-semibold">{result.credentials.employeeId}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Login email</span><span className="font-semibold">{result.credentials.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Temporary password</span><span className="font-mono font-bold text-brand-700">{result.credentials.tempPassword}</span></div>
            </div>
            <div className="mt-3 text-sm">
              {result.email?.sent ? (
                <p className="flex items-center gap-1.5 text-green-700"><Mail size={15} /> Credentials emailed to {result.credentials.email}.</p>
              ) : result.email?.dev ? (
                <p className="flex items-center gap-1.5 text-amber-600"><AlertTriangle size={15} /> Email not configured (no RESEND_API_KEY) — share the credentials above manually.</p>
              ) : (
                <p className="flex items-center gap-1.5 text-amber-600"><AlertTriangle size={15} /> Email could not be sent{result.email?.error ? `: ${result.email.error}` : ''} — share manually.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
