import { useState } from 'react';
import { Save, KeyRound, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/access';
import { PageHeader, Avatar } from '../components/ui/primitives';
import { formatCurrency, formatDate } from '../lib/format';
import { fileToCompressedDataUrl } from '../lib/upload';
import api from '../api/client';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', department: user.department || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);

  const changePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setErr('Please choose an image file'); return; }
    setErr(''); setMsg(''); setPhotoBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 512, 0.8); // square-ish profile photo
      const { data } = await api.post('/uploads', { image: dataUrl, folder: 'avatars' });
      await updateProfile({ avatar: data.url });
      setMsg('Profile photo updated.');
    } catch (e2) {
      setErr(e2.message || 'Could not update photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setErr(''); setMsg(''); setPhotoBusy(true);
    try { await updateProfile({ avatar: '' }); setMsg('Profile photo removed.'); }
    catch (e2) { setErr(e2.message); }
    finally { setPhotoBusy(false); }
  };

  const saveProfile = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { await updateProfile(form); setMsg('Profile updated.'); }
    catch (e2) { setErr(e2.message); }
  };
  const savePassword = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try { await updateProfile(pw); setPw({ currentPassword: '', newPassword: '' }); setMsg('Password changed.'); }
    catch (e2) { setErr(e2.message); }
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="View and update your account" />

      {msg && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}
      {err && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card-pad text-center">
          <div className="flex justify-center">
            <div className="relative">
              <Avatar name={user.name} src={user.avatar} size={88} />
              <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-700 text-white shadow hover:bg-brand-800" title="Change photo">
                {photoBusy ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                <input type="file" accept="image/*" className="hidden" onChange={changePhoto} disabled={photoBusy} />
              </label>
            </div>
          </div>
          {user.avatar && (
            <button onClick={removePhoto} disabled={photoBusy} className="mt-2 text-xs font-medium text-gray-400 hover:text-red-600">
              Remove photo
            </button>
          )}
          <h2 className="mt-4 text-lg font-bold text-gray-900">{user.name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="badge-blue mt-2 inline-flex">{ROLE_LABELS[user.role]}</span>
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-left text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium">{user.department}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Joined</span><span className="font-medium">{formatDate(user.joinDate)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Salary</span><span className="font-medium">{formatCurrency(user.salary)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium">{user.status}</span></div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={saveProfile} className="card-pad">
            <h3 className="mb-4 font-semibold text-gray-900">Edit details</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">Full Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="label">Department</label><input className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div><label className="label">Email (read-only)</label><input className="input bg-gray-50" value={user.email} disabled /></div>
            </div>
            <div className="mt-4"><button className="btn-primary"><Save size={18} /> Save changes</button></div>
          </form>

          <form onSubmit={savePassword} className="card-pad">
            <h3 className="mb-4 font-semibold text-gray-900">Change password</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="label">Current Password</label><input type="password" required className="input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></div>
              <div><label className="label">New Password</label><input type="password" required minLength={6} className="input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></div>
            </div>
            <div className="mt-4"><button className="btn-secondary"><KeyRound size={18} /> Update password</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}
