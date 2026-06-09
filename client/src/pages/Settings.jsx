import { useState } from 'react';
import { Megaphone, CalendarPlus, Send, ShieldCheck } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { PageHeader } from '../components/ui/primitives';
import { ACCESS_MATRIX, ROLES, ROLE_LABELS } from '../lib/access';
import api from '../api/client';

function accessLabel(v) {
  if (v === true) return { text: 'Full', cls: 'badge-green' };
  if (v === false) return { text: '—', cls: 'badge-gray' };
  return { text: v, cls: 'badge-blue' };
}

export default function Settings() {
  const { data: notices, refetch: refetchNotices } = useFetch('/notices', []);
  const [notice, setNotice] = useState({ title: '', body: '', priority: 'normal', pinned: false });
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'announcement' });
  const [holiday, setHoliday] = useState({ name: '', date: '' });
  const [msg, setMsg] = useState('');

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };

  const postNotice = async (e) => {
    e.preventDefault();
    await api.post('/notices', notice);
    setNotice({ title: '', body: '', priority: 'normal', pinned: false });
    refetchNotices(); flash('Notice posted.');
  };
  const sendBroadcast = async (e) => {
    e.preventDefault();
    await api.post('/notifications', { ...broadcast, recipient: null });
    setBroadcast({ title: '', message: '', type: 'announcement' });
    flash('Broadcast sent to all users.');
  };
  const addHoliday = async (e) => {
    e.preventDefault();
    await api.post('/holidays', holiday);
    setHoliday({ name: '', date: '' });
    flash('Holiday added.');
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Organisation administration (Super Admin only)" />
      {msg && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Post notice */}
        <form onSubmit={postNotice} className="card-pad">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><Megaphone size={18} className="text-brand-700" /> Post a Notice</h3>
          <div className="space-y-3">
            <input required className="input" placeholder="Title" value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} />
            <textarea className="input" rows={3} placeholder="Body" value={notice.body} onChange={(e) => setNotice({ ...notice, body: e.target.value })} />
            <div className="flex items-center gap-4">
              <select className="input max-w-[150px]" value={notice.priority} onChange={(e) => setNotice({ ...notice, priority: e.target.value })}>
                <option value="normal">Normal</option><option value="urgent">Urgent</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={notice.pinned} onChange={(e) => setNotice({ ...notice, pinned: e.target.checked })} /> Pin</label>
            </div>
            <button className="btn-primary"><Send size={16} /> Post Notice</button>
          </div>
        </form>

        {/* Broadcast notification */}
        <form onSubmit={sendBroadcast} className="card-pad">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><Send size={18} className="text-brand-700" /> Broadcast Notification</h3>
          <div className="space-y-3">
            <input required className="input" placeholder="Title" value={broadcast.title} onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} />
            <textarea className="input" rows={3} placeholder="Message" value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} />
            <select className="input max-w-[180px]" value={broadcast.type} onChange={(e) => setBroadcast({ ...broadcast, type: e.target.value })}>
              {['announcement', 'task', 'leave', 'tender', 'expense', 'birthday'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <button className="btn-primary"><Send size={16} /> Send to all</button>
          </div>
        </form>

        {/* Add holiday */}
        <form onSubmit={addHoliday} className="card-pad">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><CalendarPlus size={18} className="text-brand-700" /> Add Holiday</h3>
          <div className="flex flex-wrap gap-3">
            <input required className="input max-w-[220px]" placeholder="Holiday name" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} />
            <input type="date" required className="input max-w-[180px]" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} />
            <button className="btn-primary"><CalendarPlus size={16} /> Add</button>
          </div>
        </form>

        {/* Recent notices */}
        <div className="card-pad">
          <h3 className="mb-4 font-semibold text-gray-900">Recent Notices</h3>
          <div className="space-y-2">
            {(notices || []).slice(0, 5).map((n) => (
              <div key={n._id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{n.title}</span>
                {n.priority === 'urgent' && <span className="badge-red">urgent</span>}
              </div>
            ))}
            {(!notices || notices.length === 0) && <p className="text-sm text-gray-400">No notices yet.</p>}
          </div>
        </div>
      </div>

      {/* Access matrix */}
      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
          <ShieldCheck size={18} className="text-brand-700" />
          <h3 className="font-semibold text-gray-900">Role Access Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Module</th>
                {ROLES.map((r) => <th key={r} className="th text-center">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(ACCESS_MATRIX).map(([mod, roles]) => (
                <tr key={mod} className="hover:bg-gray-50">
                  <td className="td font-medium capitalize">{mod.replace('_', ' ')}</td>
                  {ROLES.map((r) => {
                    const { text, cls } = accessLabel(roles[r]);
                    return <td key={r} className="td text-center"><span className={cls}>{text}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
