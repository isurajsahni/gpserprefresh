import { useState } from 'react';
import { Clock, CalendarRange, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useFetch';
import { Loading, EmptyState, PageHeader, StatCard, Avatar, Badge } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import { ROLE_LABELS } from '../lib/access';
import { format } from 'date-fns';

const firstOfMonth = () => { const d = new Date(); d.setDate(1); return format(d, 'yyyy-MM-dd'); };
const today = () => format(new Date(), 'yyyy-MM-dd');

export default function WorkHours() {
  const [range, setRange] = useState({ from: firstOfMonth(), to: today() });
  const { data, loading } = useFetch(`/attendance/summary?from=${range.from}&to=${range.to}`, [range.from, range.to]);

  return (
    <div>
      <PageHeader title="Working Hours" subtitle="Hours worked by each employee, from check-in / check-out">
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <span className="text-gray-400">→</span>
          <input type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
      </PageHeader>

      {loading ? (
        <Loading />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState title="No attendance in this range" hint="Pick a different date range, or have the team check in." icon={CalendarRange} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Employees" value={data.rows.length} icon={Users} />
            <StatCard label="Total Hours" value={`${data.totals.totalHours}h`} icon={Clock} accent="green" />
            <StatCard label="Present Days" value={data.totals.daysPresent} icon={TrendingUp} accent="purple" />
            <StatCard label="Late Days" value={data.totals.daysLate} icon={Clock} accent="amber" />
          </div>

          {data.teamView && (
            <div className="card-pad mb-6">
              <h3 className="mb-4 font-semibold text-gray-900">Hours by employee</h3>
              <ResponsiveContainer width="100%" height={Math.max(220, data.rows.length * 42)}>
                <BarChart data={data.rows.map((r) => ({ name: r.employee.name, hours: r.totalHours }))} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip formatter={(v) => `${v}h`} />
                  <Bar dataKey="hours" fill="#0b5d3b" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <Table columns={['Employee', 'Shift', 'Total Hours', 'Avg / Day', 'Present', 'Late', 'Absent', 'Records']}>
            {data.rows.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.employee.name} size={32} />
                    <div>
                      <p className="font-medium text-gray-900">{r.employee.name}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABELS[r.employee.role]} · {r.employee.department}</p>
                    </div>
                  </div>
                </td>
                <td className="td whitespace-nowrap text-xs">{r.employee.shiftStart || '09:30'}–{r.employee.shiftEnd || '18:30'}</td>
                <td className="td font-semibold">{r.totalHours}h</td>
                <td className="td">{r.avgHours}h</td>
                <td className="td"><Badge status="Present">{r.daysPresent}</Badge></td>
                <td className="td">{r.daysLate ? <Badge status="Late">{r.daysLate}</Badge> : <span className="text-gray-400">0</span>}</td>
                <td className="td">{r.daysAbsent ? <Badge status="Absent">{r.daysAbsent}</Badge> : <span className="text-gray-400">0</span>}</td>
                <td className="td text-gray-500">{r.records}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
    </div>
  );
}
