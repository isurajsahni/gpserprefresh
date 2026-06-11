import { useState } from 'react';
import * as Icons from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState, StatCard, Badge, Avatar, PageHeader } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { CHART_COLORS } from '../lib/badges';
import { ROLE_LABELS } from '../lib/access';
import { formatDate, timeAgo } from '../lib/format';
import api from '../api/client';

// Semantic colors so the ring's color reflects progress — only Completed is
// green; in-progress/early statuses are gold/neutral, not "done"-green.
const STATUS_COLORS = {
  'To Do': '#a8a294',
  'In Progress': '#b8902e',
  'Under Review': '#0e7048',
  Completed: '#0b5d3b',
  // task statuses share the same vocabulary where they overlap
  Blocked: '#b91c1c',
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, refetch } = useFetch('/dashboard/stats', []);
  const [thought, setThought] = useState('');
  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState('');
  const [noticeForm, setNoticeForm] = useState(null); // null = closed
  const [holidayForm, setHolidayForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // Who may post each item (mirrors the backend route guards).
  const canNotice = user?.role === 'super_admin' || user?.role === 'operation';
  const canHoliday = user?.role === 'super_admin';

  const saveNotice = async (e) => {
    e.preventDefault();
    setSaveErr('');
    setSaving(true);
    try {
      await api.post('/notices', noticeForm);
      setNoticeForm(null);
      refetch();
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveHoliday = async (e) => {
    e.preventDefault();
    setSaveErr('');
    setSaving(true);
    try {
      await api.post('/holidays', holidayForm);
      setHolidayForm(null);
      refetch();
    } catch (err) {
      setSaveErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Building your dashboard…" />;
  if (!data) return <EmptyState title="No dashboard data" />;

  const { kpis, charts, recentTasks, notices, upcomingHolidays, leaderboard, goodMorningFeed } = data;

  const postThought = async (e) => {
    e.preventDefault();
    if (thought.trim().length < 5) return;
    setPosting(true);
    setPostMsg('');
    try {
      const r = await api.post('/good-morning', { message: thought });
      setThought('');
      setPostMsg(r.data.earnedPoint ? '🎉 First best thought of the day — you earned an EOM point!' : 'Posted to the feed!');
      refetch();
    } catch (err) {
      setPostMsg(err.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.name?.split(' ')[0]} 👋`}
        subtitle={`${ROLE_LABELS[user?.role]} · ${formatDate(new Date(), 'EEEE, dd MMM yyyy')}`}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = Icons[k.icon] || Icons.Activity;
          return <StatCard key={k.label} label={k.label} value={k.value} icon={Icon} />;
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charts */}
        <div className="card-pad lg:col-span-2">
          <h3 className="mb-4 font-semibold text-gray-900">Weekly hours logged</h3>
          {charts.attendanceTrend?.some((d) => d.hours > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={charts.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#0b5d3b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No attendance yet" hint="Check in from the Attendance page to see your hours." />
          )}
        </div>

        <div className="card-pad">
          <h3 className="mb-4 font-semibold text-gray-900">Project status</h3>
          {charts.projectStatusChart?.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={charts.projectStatusChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={charts.projectStatusChart.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {charts.projectStatusChart.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(val, entry) => `${val} — ${entry?.payload?.value ?? ''}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No projects" />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent tasks */}
        <div className="card lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="font-semibold text-gray-900">Recent tasks</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTasks?.length ? (
              recentTasks.map((t) => (
                <div key={t._id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{t.title}</p>
                    <p className="text-xs text-gray-400">
                      {t.project?.name || 'No project'} · {t.assignee?.name || 'Unassigned'}
                    </p>
                  </div>
                  <Badge status={t.status} />
                </div>
              ))
            ) : (
              <EmptyState title="No recent tasks" />
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <Icons.Trophy size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Employee of the Month</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {leaderboard?.length ? (
              leaderboard.map((r) => (
                <div key={r._id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    r.rank === 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.rank}
                  </span>
                  <Avatar name={r.employee?.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{r.employee?.name}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[r.employee?.role]}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-700">{r.points}</span>
                </div>
              ))
            ) : (
              <EmptyState title="No recognition yet" />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Good morning feed */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <Icons.Sunrise size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">Today’s Good Morning feed</h3>
          </div>
          <div className="px-5 py-4">
            <form onSubmit={postThought} className="flex gap-2">
              <input
                className="input"
                placeholder="Share your best thought of the day…"
                value={thought}
                onChange={(e) => setThought(e.target.value)}
              />
              <button disabled={posting} className="btn-primary whitespace-nowrap">Post</button>
            </form>
            {postMsg && <p className="mt-2 text-xs font-medium text-brand-700">{postMsg}</p>}
            <div className="mt-4 space-y-3">
              {goodMorningFeed?.length ? (
                goodMorningFeed.map((g) => (
                  <div key={g._id} className="flex gap-3">
                    <Avatar name={g.user?.name} size={34} />
                    <div className="flex-1 rounded-xl bg-gray-50 px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">{g.user?.name}</p>
                        {g.earnedPoint && <span className="badge-purple">+1 EOM</span>}
                      </div>
                      <p className="text-sm text-gray-600">{g.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">Be the first to post today!</p>
              )}
            </div>
          </div>
        </div>

        {/* Notices + Holidays */}
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <Icons.Megaphone size={18} className="text-brand-700" />
              <h3 className="font-semibold text-gray-900">Notice board</h3>
              {canNotice && (
                <button onClick={() => { setSaveErr(''); setNoticeForm({ title: '', body: '', priority: 'normal', pinned: false }); }} className="btn-ghost btn-sm ml-auto">
                  <Icons.Plus size={16} /> Add
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {notices?.length ? (
                notices.map((n) => (
                  <div key={n._id} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {n.pinned && <Icons.Pin size={13} className="text-brand-600" />}
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      {n.priority === 'urgent' && <Badge status="urgent">urgent</Badge>}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{n.body}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No notices" />
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <Icons.CalendarHeart size={18} className="text-green-600" />
              <h3 className="font-semibold text-gray-900">Upcoming holidays</h3>
              {canHoliday && (
                <button onClick={() => { setSaveErr(''); setHolidayForm({ name: '', date: '' }); }} className="btn-ghost btn-sm ml-auto">
                  <Icons.Plus size={16} /> Add
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingHolidays?.length ? (
                upcomingHolidays.map((h) => (
                  <div key={h._id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm font-medium text-gray-900">{h.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(h.date, 'dd MMM')}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No upcoming holidays" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post a notice */}
      <Modal open={!!noticeForm} onClose={() => setNoticeForm(null)} title="Post a notice"
        footer={<><button onClick={() => setNoticeForm(null)} className="btn-secondary">Cancel</button><button form="notice-form" disabled={saving} className="btn-primary">Post</button></>}>
        {saveErr && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveErr}</div>}
        <form id="notice-form" onSubmit={saveNotice} className="space-y-3">
          <div><label className="label">Title</label><input required className="input" value={noticeForm?.title || ''} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} /></div>
          <div><label className="label">Details <span className="font-normal text-gray-400">(optional)</span></label><textarea rows={3} className="input" value={noticeForm?.body || ''} onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })} /></div>
          <div className="flex items-end gap-4">
            <div className="flex-1"><label className="label">Priority</label>
              <select className="input" value={noticeForm?.priority || 'normal'} onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
              <input type="checkbox" checked={!!noticeForm?.pinned} onChange={(e) => setNoticeForm({ ...noticeForm, pinned: e.target.checked })} /> Pin to top
            </label>
          </div>
        </form>
      </Modal>

      {/* Add a holiday */}
      <Modal open={!!holidayForm} onClose={() => setHolidayForm(null)} title="Add a holiday"
        footer={<><button onClick={() => setHolidayForm(null)} className="btn-secondary">Cancel</button><button form="holiday-form" disabled={saving} className="btn-primary">Add</button></>}>
        {saveErr && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{saveErr}</div>}
        <form id="holiday-form" onSubmit={saveHoliday} className="space-y-3">
          <div><label className="label">Holiday name</label><input required className="input" placeholder="e.g. Diwali" value={holidayForm?.name || ''} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} /></div>
          <div><label className="label">Date</label><input type="date" required className="input" value={holidayForm?.date || ''} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
