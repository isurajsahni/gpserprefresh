import { useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone, TrendingUp } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, StatCard } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { formatCurrencyShort, formatDate } from '../lib/format';
import api from '../api/client';

const STATUSES = ['Draft', 'Active', 'Completed'];
const empty = { name: '', channel: '', budget: 0, spent: 0, leads: 0, status: 'Draft', startDate: '', endDate: '', assignedTo: '' };

export default function Campaigns() {
  const { user } = useAuth();
  const writable = canWrite('campaigns', user.role);
  const { data, loading, refetch } = useFetch('/campaigns', []);
  const users = useUserOptions();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (c) => {
    setError('');
    if (c) { setForm({ ...empty, ...c, assignedTo: c.assignedTo?._id || '', startDate: c.startDate?.slice(0, 10), endDate: c.endDate?.slice(0, 10) }); setModal({ id: c._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };
  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null };
      if (modal.id) await api.put(`/campaigns/${modal.id}`, payload); else await api.post('/campaigns', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };
  const remove = async (id) => { if (confirm('Delete campaign?')) { await api.delete(`/campaigns/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const campaigns = data || [];
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Marketing spend & results">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> New Campaign</button>}
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Campaigns" value={campaigns.length} icon={Megaphone} />
        <StatCard label="Total Spent" value={formatCurrencyShort(totalSpent)} icon={Megaphone} accent="amber" />
        <StatCard label="Leads Generated" value={totalLeads} icon={TrendingUp} accent="green" />
      </div>

      {campaigns.length === 0 ? <EmptyState title="No campaigns" /> : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <div key={c._id} className="card-pad">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-semibold text-gray-900">{c.name}</h3><p className="text-xs text-gray-400">{c.channel}</p></div>
                <Badge status={c.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div><p className="text-xs text-gray-400">Budget</p><p className="font-semibold">{formatCurrencyShort(c.budget)}</p></div>
                <div><p className="text-xs text-gray-400">Spent</p><p className="font-semibold">{formatCurrencyShort(c.spent)}</p></div>
                <div><p className="text-xs text-gray-400">Leads</p><p className="font-semibold text-brand-700">{c.leads}</p></div>
              </div>
              <p className="mt-3 text-xs text-gray-400">{formatDate(c.startDate, 'dd MMM')} – {formatDate(c.endDate, 'dd MMM')} · {c.assignedTo?.name || 'Unassigned'}</p>
              {writable && (
                <div className="mt-3 flex justify-end gap-1 border-t border-gray-50 pt-3">
                  <button onClick={() => open(c)} className="btn-ghost btn-sm"><Pencil size={15} /></button>
                  <button onClick={() => remove(c._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Campaign' : 'New Campaign'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="camp-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="camp-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Channel</label><input className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} /></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Budget (₹)</label><input type="number" className="input" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></div>
          <div><label className="label">Spent (₹)</label><input type="number" className="input" value={form.spent} onChange={(e) => setForm({ ...form, spent: Number(e.target.value) })} /></div>
          <div><label className="label">Leads</label><input type="number" className="input" value={form.leads} onChange={(e) => setForm({ ...form, leads: Number(e.target.value) })} /></div>
          <div><label className="label">Owner</label><select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}><option value="">— None —</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
          <div><label className="label">Start</label><input type="date" className="input" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><label className="label">End</label><input type="date" className="input" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
