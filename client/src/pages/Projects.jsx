import { useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { formatCurrencyShort, formatDate } from '../lib/format';
import api from '../api/client';

const STATUSES = ['To Do', 'In Progress', 'Under Review', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const empty = { name: '', description: '', status: 'To Do', priority: 'Medium', startDate: '', endDate: '', manager: '', assignees: [], budget: 0, spent: 0, progress: 0, tags: '' };

export default function Projects() {
  const { user } = useAuth();
  const writable = canWrite('projects', user.role);
  const { data, loading, refetch } = useFetch('/projects', []);
  const users = useUserOptions();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (p) => {
    setError('');
    if (p) {
      setForm({ ...empty, ...p, manager: p.manager?._id || '', assignees: (p.assignees || []).map((a) => a._id),
        tags: (p.tags || []).join(', '), startDate: p.startDate?.slice(0, 10), endDate: p.endDate?.slice(0, 10) });
      setModal({ id: p._id });
    } else { setForm(empty); setModal({ id: null }); }
  };

  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, manager: form.manager || null, tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [] };
      if (modal.id) await api.put(`/projects/${modal.id}`, payload);
      else await api.post('/projects', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => { if (confirm('Delete this project?')) { await api.delete(`/projects/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const projects = data || [];

  return (
    <div>
      <PageHeader title="Projects" subtitle="Boards, budgets & progress">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> New Project</button>}
      </PageHeader>

      {projects.length === 0 ? (
        <EmptyState title="No projects" hint={writable ? 'Create your first project.' : 'No projects assigned to you.'} />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <div key={p._id} className="card-pad flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <Badge status={p.priority} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{p.description}</p>

              <div className="mt-3 flex items-center gap-2">
                <Badge status={p.status} />
                <span className="text-xs text-gray-400">{formatDate(p.endDate, 'dd MMM')}</span>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-gray-500"><span>Progress</span><span>{p.progress}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${p.progress}%` }} /></div>
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-500">Budget</span>
                <span className="font-medium">{formatCurrencyShort(p.spent)} / {formatCurrencyShort(p.budget)}</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {(p.assignees || []).slice(0, 4).map((a) => <div key={a._id} className="ring-2 ring-white rounded-full"><Avatar name={a.name} src={a.avatar} size={28} /></div>)}
                  {(p.assignees || []).length === 0 && <span className="text-xs text-gray-400"><Users size={14} className="inline" /> Unassigned</span>}
                </div>
                {writable && (
                  <div className="flex gap-1">
                    <button onClick={() => open(p)} className="btn-ghost btn-sm"><Pencil size={15} /></button>
                    <button onClick={() => remove(p._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} size="lg" title={modal?.id ? 'Edit Project' : 'New Project'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="proj-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="proj-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Start Date</label><input type="date" className="input" value={form.startDate || ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div><label className="label">End Date</label><input type="date" className="input" value={form.endDate || ''} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          <div><label className="label">Budget (₹)</label><input type="number" className="input" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} /></div>
          <div><label className="label">Spent (₹)</label><input type="number" className="input" value={form.spent} onChange={(e) => setForm({ ...form, spent: Number(e.target.value) })} /></div>
          <div><label className="label">Progress (%)</label><input type="number" min="0" max="100" className="input" value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} /></div>
          <div><label className="label">Manager</label><select className="input" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })}><option value="">— None —</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="label">Assignees (Ctrl/Cmd-click for multiple)</label>
            <select multiple className="input h-28" value={form.assignees} onChange={(e) => setForm({ ...form, assignees: Array.from(e.target.selectedOptions, (o) => o.value) })}>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name} · {u.department}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
