import { useState } from 'react';
import { Plus, Pencil, Trash2, FileText, CalendarClock } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, StatCard } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { formatCurrencyShort, formatDate } from '../lib/format';
import api from '../api/client';

const CATEGORIES = ['Government', 'Private', 'Education', 'Healthcare'];
const STATUSES = ['Draft', 'Published', 'Under Evaluation', 'Awarded', 'Closed'];
const empty = { title: '', client: '', authority: '', value: 0, category: 'Government', status: 'Draft', deadline: '', documents: 0, description: '' };

export default function Tenders() {
  const { user } = useAuth();
  const writable = canWrite('tenders', user.role);
  const { data, loading, refetch } = useFetch('/tenders', []);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (t) => {
    setError('');
    if (t) { setForm({ ...empty, ...t, deadline: t.deadline?.slice(0, 10) }); setModal({ id: t._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };
  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      if (modal.id) await api.put(`/tenders/${modal.id}`, form);
      else await api.post('/tenders', form);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };
  const remove = async (id) => { if (confirm('Delete tender?')) { await api.delete(`/tenders/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const tenders = data || [];
  const totalValue = tenders.reduce((s, t) => s + t.value, 0);
  const active = tenders.filter((t) => ['Published', 'Under Evaluation'].includes(t.status)).length;
  const awarded = tenders.filter((t) => t.status === 'Awarded').length;

  return (
    <div>
      <PageHeader title="Tenders" subtitle="Pipeline, value & deadlines">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> New Tender</button>}
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pipeline Value" value={formatCurrencyShort(totalValue)} icon={FileText} />
        <StatCard label="Active" value={active} icon={CalendarClock} accent="amber" />
        <StatCard label="Awarded" value={awarded} icon={FileText} accent="green" />
      </div>

      {tenders.length === 0 ? (
        <EmptyState title="No tenders" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {tenders.map((t) => (
            <div key={t._id} className="card-pad">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.title}</h3>
                  <p className="text-sm text-gray-500">{t.client} · {t.authority}</p>
                </div>
                <Badge status={t.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-gray-500">{t.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="font-semibold text-brand-700">{formatCurrencyShort(t.value)}</span>
                <span className="badge-gray">{t.category}</span>
                <span className="text-gray-500"><CalendarClock size={13} className="inline" /> {formatDate(t.deadline)}</span>
                <span className="text-gray-400">{t.documents} docs</span>
              </div>
              {writable && (
                <div className="mt-3 flex justify-end gap-1 border-t border-gray-50 pt-3">
                  <button onClick={() => open(t)} className="btn-ghost btn-sm"><Pencil size={15} /> Edit</button>
                  <button onClick={() => remove(t._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} size="lg" title={modal?.id ? 'Edit Tender' : 'New Tender'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="tender-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="tender-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title</label><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Client</label><input className="input" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} /></div>
          <div><label className="label">Authority</label><input className="input" value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })} /></div>
          <div><label className="label">Value (₹)</label><input type="number" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
          <div><label className="label">Documents</label><input type="number" className="input" value={form.documents} onChange={(e) => setForm({ ...form, documents: Number(e.target.value) })} /></div>
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label">Deadline</label><input type="date" className="input" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
