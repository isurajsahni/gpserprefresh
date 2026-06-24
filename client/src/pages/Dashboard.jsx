import { useState } from 'react';
import * as Icons from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { Loading, EmptyState, StatCard, Badge, Avatar, PageHeader } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
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
  const isSuperAdmin = user?.role === 'super_admin';
  const [viewUserId, setViewUserId] = useState(''); // '' = my own dashboard
  const allUsers = useUserOptions();
  const statsUrl = viewUserId ? `/dashboard/stats?as=${viewUserId}` : '/dashboard/stats';
  const { data, loading, refetch } = useFetch(statsUrl, [statsUrl]);
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

  const { kpis, charts, recentTasks, notices, upcomingHolidays, leaderboard, goodMorningFeed, viewingAs } = data;
  const viewing = !!viewingAs; // read-only: viewing another user's dashboard

  // Project/task widgets only show on the web developer's dashboard. Open Leads
  // is removed everywhere.
  const isWebDev = (viewingAs?.role || user?.role) === 'web_developer';
  const hiddenKpis = new Set(['Open Leads']);
  if (!isWebDev) { hiddenKpis.add('My Projects'); hiddenKpis.add('Open Tasks'); }
  const visibleKpis = kpis.filter((k) => !hiddenKpis.has(k.label));

  // Project progress gauge — weighted so in-progress work counts as partial
  // progress (not 0% until fully done). The ring fills to the average progress.
  const STATUS_WEIGHT = { 'To Do': 0, 'In Progress': 0.5, 'Under Review': 0.85, Completed: 1 };
  const projDist = charts.projectStatusChart || [];
  const projTotal = projDist.reduce((s, d) => s + d.value, 0);
  const projDone = projDist.find((d) => d.name === 'Completed')?.value || 0;
  const projScore = projDist.reduce((s, d) => s + (STATUS_WEIGHT[d.name] ?? 0) * d.value, 0);
  const projPct = projTotal ? Math.round((projScore / projTotal) * 100) : 0;
  const gaugeData = [
    { name: 'Progress', value: projPct },
    { name: 'Remaining', value: 100 - projPct },
  ];

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
        title={viewing ? `${viewingAs.name}'s dashboard` : `Good day, ${user?.name?.split(' ')[0]} 👋`}
        subtitle={viewing ? `${ROLE_LABELS[viewingAs.role]} · viewing read-only` : `${ROLE_LABELS[user?.role]} · ${formatDate(new Date(), 'EEEE, dd MMM yyyy')}`}
      >
        {isSuperAdmin && (
          <select
            className="input max-w-[15rem]"
            value={viewUserId}
            onChange={(e) => setViewUserId(e.target.value)}
            title="View a user's dashboard (read-only)"
          >
            <option value="">My dashboard</option>
            {allUsers.filter((u) => u._id !== user._id).map((u) => (
              <option key={u._id} value={u._id}>View: {u.name}</option>
            ))}
          </select>
        )}
      </PageHeader>

      {viewing && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Icons.Eye size={16} />
          You're viewing <b>{viewingAs.name}</b>'s dashboard in read-only mode.
          <button onClick={() => setViewUserId('')} className="ml-auto font-semibold text-amber-900 underline">Exit</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleKpis.map((k) => {
          const Icon = Icons[k.icon] || Icons.Activity;
          return <StatCard key={k.label} label={k.label} value={k.value} icon={Icon} />;
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Charts */}
        <div className={`card-pad ${isWebDev ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
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

        {isWebDev && (
        <div className="card-pad">
          <h3 className="mb-4 font-semibold text-gray-900">Project progress</h3>
          {projTotal ? (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={62}
                      outerRadius={88}
                      startAngle={90}
                      endAngle={-270}
                      stroke="none"
                    >
                      <Cell fill="#0b5d3b" />
                      <Cell fill="#e7e4dc" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{projPct}%</span>
                  <span className="text-xs text-gray-400">{projDone} of {projTotal} completed</span>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {projDist.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name] || '#a8a294' }} />
                    <span className="text-gray-600">{d.name}</span>
                    <span className="ml-auto font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="No projects" />
          )}
        </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent tasks (web developer only) */}
        {isWebDev && (
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
        )}

        {/* Leaderboard */}
        <div className={`card ${isWebDev ? '' : 'lg:col-span-3'}`}>
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
                  <Avatar name={r.employee?.name} src={r.employee?.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{r.employee?.name}</p>
                    <p className="truncate text-xs text-gray-400">
                      {r.breakdown
                        ? `${r.breakdown.tasksOnTime} on-time · ${r.breakdown.hours}h${r.breakdown.gmFirst ? ` · ${r.breakdown.gmFirst}× first` : ''}`
                        : ROLE_LABELS[r.employee?.role]}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-brand-700" title="Performance score">{r.points}</span>
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
            {!viewing && (
              <>
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
              </>
            )}
            <div className="mt-4 space-y-3">
              {goodMorningFeed?.length ? (
                goodMorningFeed.map((g) => (
                  <div key={g._id} className="flex gap-3">
                    <Avatar name={g.user?.name} src={g.user?.avatar} size={34} />
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
              {canNotice && !viewing && (
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
              {canHoliday && !viewing && (
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
