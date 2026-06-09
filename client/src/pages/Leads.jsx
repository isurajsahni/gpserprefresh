import { useState } from 'react';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, StatCard } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { formatCurrencyShort, formatDate } from '../lib/format';
import api from '../api/client';

const SOURCES = ['Website', 'Campaign', 'Referral', 'Trade Show', 'LinkedIn'];
const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'];
const empty = { name: '', contact: '', email: '', phone: '', source: 'Website', status: 'New', value: 0, assignedTo: '' };

export default function Leads() {
  const { user } = useAuth();
  const writable = canWrite('leads', user.role);
  const { data, loading, refetch } = useFetch('/leads', []);
  const users = useUserOptions();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (l) => {
    setError('');
    if (l) { setForm({ ...empty, ...l, assignedTo: l.assignedTo?._id || '' }); setModal({ id: l._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };
  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null };
      if (modal.id) await api.put(`/leads/${modal.id}`, payload); else await api.post('/leads', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };
  const remove = async (id) => { if (confirm('Delete lead?')) { await api.delete(`/leads/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const leads = data || [];
  const pipeline = leads.filter((l) => !['Converted', 'Lost'].includes(l.status)).reduce((s, l) => s + l.value, 0);
  const won = leads.filter((l) => l.status === 'Converted').length;

  return (
    <div>
      <PageHeader title="Leads" subtitle="CRM pipeline by stage">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> New Lead</button>}
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open Pipeline" value={formatCurrencyShort(pipeline)} icon={Target} />
        <StatCard label="Total Leads" value={leads.length} icon={Target} accent="purple" />
        <StatCard label="Converted" value={won} icon={Target} accent="green" />
      </div>

      {/* Kanban by status */}
      {leads.length === 0 ? <EmptyState title="No leads" /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {STATUSES.map((status) => {
            const col = leads.filter((l) => l.status === status);
            return (
              <div key={status} className="rounded-xl bg-gray-100/70 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{status}</h3>
                  <span className="badge-gray">{col.length}</span>
                </div>
                <div className="space-y-3">
                  {col.map((l) => (
                    <div key={l._id} className="card p-3">
                      <p className="text-sm font-semibold text-gray-900">{l.name}</p>
                      <p className="text-xs text-gray-400">{l.contact}</p>
                      <p className="mt-2 text-sm font-medium text-brand-700">{formatCurrencyShort(l.value)}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="badge-gray">{l.source}</span>
                        <span className="text-[11px] text-gray-400">{formatDate(l.lastContact, 'dd MMM')}</span>
                      </div>
                      {writable && (
                        <div className="mt-2 flex justify-end gap-0.5 border-t border-gray-50 pt-2">
                          <button onClick={() => open(l)} className="btn-ghost btn-sm"><Pencil size={13} /></button>
                          <button onClick={() => remove(l._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  ))}
                  {col.length === 0 && <p className="px-1 py-3 text-center text-xs text-gray-400">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Lead' : 'New Lead'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="lead-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="lead-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="label">Company</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Contact Person</label><input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label className="label">Source</label><select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Value (₹)</label><input type="number" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
          <div><label className="label">Owner</label><select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}><option value="">— None —</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
        </form>
      </Modal>
    </div>
  );
}
