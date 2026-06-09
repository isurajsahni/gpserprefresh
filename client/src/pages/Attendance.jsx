import { useState } from 'react';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { getAccess } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar, StatCard } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import { formatDate } from '../lib/format';
import api from '../api/client';

export default function Attendance() {
  const { user } = useAuth();
  const access = getAccess('attendance', user.role);
  const teamView = access === 'team' || access === true;
  const { data, loading, refetch } = useFetch('/attendance', []);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const act = async (kind) => {
    setBusy(true); setMsg('');
    try {
      await api.post(`/attendance/${kind}`);
      setMsg(kind === 'checkin' ? '✅ Checked in successfully' : '✅ Checked out successfully');
      refetch();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  const records = data || [];
  const today = new Date().toDateString();
  const mine = records.filter((r) => String(r.employee?._id || r.employee) === String(user._id));
  const todayRec = mine.find((r) => new Date(r.date).toDateString() === today);

  const present = records.filter((r) => r.status === 'Present').length;
  const late = records.filter((r) => r.status === 'Late').length;
  const absent = records.filter((r) => r.status === 'Absent').length;

  return (
    <div>
      <PageHeader title="Attendance" subtitle={teamView ? 'Team attendance & summaries' : 'Your check-in / check-out history'}>
        <div className="flex gap-2">
          <button onClick={() => act('checkin')} disabled={busy || todayRec?.checkIn} className="btn-primary">
            <LogIn size={18} /> Check In
          </button>
          <button onClick={() => act('checkout')} disabled={busy || !todayRec?.checkIn || todayRec?.checkOut} className="btn-secondary">
            <LogOut size={18} /> Check Out
          </button>
        </div>
      </PageHeader>

      {msg && <div className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{msg}</div>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today" value={todayRec ? todayRec.status : 'Not marked'} icon={Clock} hint={todayRec?.checkIn ? `In ${todayRec.checkIn}${todayRec.checkOut ? ` · Out ${todayRec.checkOut}` : ''}` : ''} />
        <StatCard label="Present" value={present} icon={Clock} accent="green" />
        <StatCard label="Late" value={late} icon={Clock} accent="amber" />
        <StatCard label="Absent" value={absent} icon={Clock} accent="red" />
      </div>

      {records.length === 0 ? (
        <EmptyState title="No attendance records" hint="Check in to create your first record." />
      ) : (
        <Table columns={[teamView ? 'Employee' : null, 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].filter(Boolean)}>
          {records.map((r) => (
            <tr key={r._id} className="hover:bg-gray-50">
              {teamView && (
                <td className="td">
                  <div className="flex items-center gap-2"><Avatar name={r.employee?.name} size={30} /><span className="font-medium text-gray-900">{r.employee?.name}</span></div>
                </td>
              )}
              <td className="td">{formatDate(r.date)}</td>
              <td className="td">{r.checkIn || '—'}</td>
              <td className="td">{r.checkOut || '—'}</td>
              <td className="td">{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
              <td className="td"><Badge status={r.status} /></td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
