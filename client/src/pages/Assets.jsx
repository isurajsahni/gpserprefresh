import { useState } from 'react';
import { Plus, Pencil, Trash2, Boxes, UserCheck, UserMinus } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, StatCard } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatCurrency, formatDate } from '../lib/format';
import api from '../api/client';

const CATEGORIES = ['Laptop', 'Mobile', 'Monitor', 'Software', 'Furniture'];
const empty = { name: '', category: 'Laptop', serialNo: '', assignedTo: '', purchaseDate: '', value: 0, condition: 'Good' };

export default function Assets() {
  const { user } = useAuth();
  const writable = canWrite('assets', user.role);
  const { data, loading, refetch } = useFetch('/assets', []);
  const users = useUserOptions();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (a) => {
    setError('');
    if (a) { setForm({ ...empty, ...a, assignedTo: a.assignedTo?._id || '', purchaseDate: a.purchaseDate?.slice(0, 10) }); setModal({ id: a._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };
  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, assignedTo: form.assignedTo || null, status: form.assignedTo ? 'Assigned' : 'Available' };
      if (modal.id) await api.put(`/assets/${modal.id}`, payload); else await api.post('/assets', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };
  const toggle = async (a) => {
    await api.put(`/assets/${a._id}`, a.assignedTo ? { assignedTo: null, status: 'Available' } : { status: a.status });
    refetch();
  };
  const remove = async (id) => { if (confirm('Delete asset?')) { await api.delete(`/assets/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const assets = data || [];
  const assigned = assets.filter((a) => a.status === 'Assigned').length;
  const totalValue = assets.reduce((s, a) => s + a.value, 0);

  return (
    <div>
      <PageHeader title="Assets & Inventory" subtitle="Asset register, assignment & value">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> Add Asset</button>}
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Assets" value={assets.length} icon={Boxes} />
        <StatCard label="Assigned" value={`${assigned}/${assets.length}`} icon={Boxes} accent="purple" />
        <StatCard label="Total Value" value={formatCurrency(totalValue)} icon={Boxes} accent="green" />
      </div>

      {assets.length === 0 ? <EmptyState title="No assets" /> : (
        <Table columns={['Asset', 'Category', 'Serial', 'Assigned To', 'Value', 'Condition', 'Status', writable ? '' : null].filter((c) => c !== null)}>
          {assets.map((a) => (
            <tr key={a._id} className="hover:bg-gray-50">
              <td className="td font-medium text-gray-900">{a.name}</td>
              <td className="td"><span className="badge-gray">{a.category}</span></td>
              <td className="td text-xs text-gray-500">{a.serialNo}</td>
              <td className="td">{a.assignedTo?.name || '—'}</td>
              <td className="td">{formatCurrency(a.value)}</td>
              <td className="td">{a.condition}</td>
              <td className="td"><Badge status={a.status} /></td>
              {writable && (
                <td className="td">
                  <div className="flex gap-1">
                    <button title={a.assignedTo ? 'Unassign' : 'Assign'} onClick={() => a.assignedTo ? toggle(a) : open(a)} className="btn-ghost btn-sm">
                      {a.assignedTo ? <UserMinus size={15} /> : <UserCheck size={15} />}
                    </button>
                    <button onClick={() => open(a)} className="btn-ghost btn-sm"><Pencil size={15} /></button>
                    <button onClick={() => remove(a._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Asset' : 'Add Asset'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="asset-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="asset-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Serial No.</label><input className="input" value={form.serialNo} onChange={(e) => setForm({ ...form, serialNo: e.target.value })} /></div>
          <div><label className="label">Assigned To</label><select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}><option value="">— Available —</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
          <div><label className="label">Condition</label><input className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} /></div>
          <div><label className="label">Purchase Date</label><input type="date" className="input" value={form.purchaseDate || ''} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
          <div><label className="label">Value (₹)</label><input type="number" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></div>
        </form>
      </Modal>
    </div>
  );
}
