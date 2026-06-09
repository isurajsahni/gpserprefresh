import { useState } from 'react';
import { Plus, Pencil, Trash2, Clock, ChevronRight } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { formatDate } from '../lib/format';
import api from '../api/client';

const STATUSES = ['To Do', 'In Progress', 'Under Review', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const empty = { title: '', description: '', project: '', assignee: '', priority: 'Medium', status: 'To Do', dueDate: '', timeLogged: 0 };

export default function Tasks() {
  const { user } = useAuth();
  const writable = canWrite('tasks', user.role);
  const { data, loading, refetch } = useFetch('/tasks', []);
  const { data: projects } = useFetch('/projects', []);
  const users = useUserOptions();
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (t) => {
    setError('');
    if (t) { setForm({ ...empty, ...t, project: t.project?._id || '', assignee: t.assignee?._id || '', dueDate: t.dueDate?.slice(0, 10) }); setModal({ id: t._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };

  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, project: form.project || null, assignee: form.assignee || null };
      if (modal.id) await api.put(`/tasks/${modal.id}`, payload);
      else await api.post('/tasks', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };

  const move = async (t, status) => { await api.put(`/tasks/${t._id}`, { status }); refetch(); };
  const remove = async (id) => { if (confirm('Delete task?')) { await api.delete(`/tasks/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const tasks = data || [];

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Board grouped by status">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> New Task</button>}
      </PageHeader>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks" hint={writable ? 'Create your first task.' : 'No tasks assigned to you.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((status) => {
            const col = tasks.filter((t) => t.status === status);
            return (
              <div key={status} className="rounded-xl bg-gray-100/70 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-gray-700">{status}</h3>
                  <span className="badge-gray">{col.length}</span>
                </div>
                <div className="space-y-3">
                  {col.map((t) => (
                    <div key={t._id} className="card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900">{t.title}</p>
                        <Badge status={t.priority} />
                      </div>
                      {t.project?.name && <p className="mt-1 text-xs text-gray-400">{t.project.name}</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {t.assignee ? <Avatar name={t.assignee.name} size={24} /> : <span className="text-xs text-gray-400">Unassigned</span>}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12} /> {t.timeLogged}h</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-gray-50 pt-2">
                        <span className="text-[11px] text-gray-400">{formatDate(t.dueDate, 'dd MMM')}</span>
                        {writable && (
                          <div className="flex gap-0.5">
                            {STATUSES.indexOf(status) < 3 && (
                              <button title="Advance" onClick={() => move(t, STATUSES[STATUSES.indexOf(status) + 1])} className="btn-ghost btn-sm"><ChevronRight size={14} /></button>
                            )}
                            <button onClick={() => open(t)} className="btn-ghost btn-sm"><Pencil size={13} /></button>
                            <button onClick={() => remove(t._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {col.length === 0 && <p className="px-1 py-4 text-center text-xs text-gray-400">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Task' : 'New Task'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="task-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="task-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Title</label><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><label className="label">Project</label><select className="input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })}><option value="">— None —</option>{(projects || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
          <div><label className="label">Assignee</label><select className="input" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}><option value="">— Unassigned —</option>{users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}</select></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Priority</label><select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Due Date</label><input type="date" className="input" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
          <div><label className="label">Time Logged (h)</label><input type="number" className="input" value={form.timeLogged} onChange={(e) => setForm({ ...form, timeLogged: Number(e.target.value) })} /></div>
        </form>
      </Modal>
    </div>
  );
}
