import { useState } from 'react';
import { Plus, Pencil, Trash2, Palette, FileImage, FileText, Layout, Shapes, Image } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import ImageUpload from '../components/ui/ImageUpload';
import { formatDate } from '../lib/format';
import api from '../api/client';

const TYPES = ['Logo', 'Document', 'Template', 'Image', 'Icons'];
const TYPE_ICON = { Logo: Palette, Document: FileText, Template: Layout, Image: Image, Icons: Shapes };
const empty = { name: '', type: 'Image', format: '', size: '', version: 'v1.0', tags: '', url: '' };

export default function DesignLibrary() {
  const { user } = useAuth();
  const writable = canWrite('design_library', user.role);
  const { data, loading, refetch } = useFetch('/design-assets', []);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const open = (a) => {
    setError('');
    if (a) { setForm({ ...empty, ...a, tags: (a.tags || []).join(', ') }); setModal({ id: a._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };
  const save = async (e) => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [] };
      if (modal.id) await api.put(`/design-assets/${modal.id}`, payload); else await api.post('/design-assets', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };
  const remove = async (id) => { if (confirm('Delete asset?')) { await api.delete(`/design-assets/${id}`); refetch(); } };

  if (loading) return <Loading />;
  const assets = (data || []).filter((a) => filter === 'All' || a.type === filter);

  return (
    <div>
      <PageHeader title="Design Library" subtitle="Versioned brand & design assets">
        {writable && <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> Upload Asset</button>}
      </PageHeader>

      <div className="mb-4 flex flex-wrap gap-2">
        {['All', ...TYPES].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-full px-3 py-1 text-sm font-medium ${filter === t ? 'bg-brand-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{t}</button>
        ))}
      </div>

      {assets.length === 0 ? <EmptyState title="No design assets" icon={FileImage} /> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((a) => {
            const Icon = TYPE_ICON[a.type] || FileImage;
            return (
              <div key={a._id} className="card-pad">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noreferrer" className="block h-24 overflow-hidden rounded-lg border border-gray-100">
                    <img src={a.url} alt={a.name} className="h-24 w-full object-cover" />
                  </a>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-gray-50 text-brand-600">
                    <Icon size={36} />
                  </div>
                )}
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.format} · {a.size} · {a.version}</p>
                  </div>
                  <span className="badge-blue shrink-0">{a.type}</span>
                </div>
                {a.tags?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{a.tags.map((t) => <span key={t} className="badge-gray">{t}</span>)}</div>}
                <p className="mt-2 text-[11px] text-gray-400">By {a.uploadedBy?.name || '—'} · {formatDate(a.uploadedOn)}</p>
                {writable && (
                  <div className="mt-2 flex justify-end gap-1 border-t border-gray-50 pt-2">
                    <button onClick={() => open(a)} className="btn-ghost btn-sm"><Pencil size={14} /></button>
                    <button onClick={() => remove(a._id)} className="btn-ghost btn-sm text-red-600"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Asset' : 'Upload Asset'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="da-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="da-form" onSubmit={save} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Type</label><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className="label">Format</label><input className="input" placeholder="SVG, PNG, PDF…" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} /></div>
          <div><label className="label">Size</label><input className="input" placeholder="e.g. 2.4 MB" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></div>
          <div><label className="label">Version</label><input className="input" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className="label">Tags (comma separated)</label><input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="label">Image / screenshot</label>
            <ImageUpload value={form.url} onChange={(url) => setForm({ ...form, url })} folder="design" label="Upload image" />
          </div>
          <div className="sm:col-span-2"><label className="label">…or paste a URL</label><input className="input" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
