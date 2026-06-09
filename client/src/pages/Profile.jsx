import { useState } from 'react';
import { Save, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/access';
import { PageHeader, Avatar } from '../components/ui/primitives';
import { formatCurrency, formatDate } from '../lib/format';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', department: user.department || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

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
          <div className="flex justify-center"><Avatar name={user.name} size={88} /></div>
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
