import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Wallet, Target, FileText, Users } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { Loading, EmptyState, PageHeader, StatCard } from '../components/ui/primitives';
import { CHART_COLORS } from '../lib/badges';
import { formatCurrencyShort } from '../lib/format';

function ChartCard({ title, children }) {
  return (
    <div className="card-pad">
      <h3 className="mb-4 font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

export default function Reports() {
  const { data, loading } = useFetch('/reports/overview', []);
  if (loading) return <Loading />;
  if (!data) return <EmptyState title="No report data" />;

  const { budgetVsSpent, expenseByCategory, leadFunnel, tenderByCategory, campaignPerformance, headcountByDept, totals } = data;

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Cross-module insights and summaries" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Budget" value={formatCurrencyShort(totals.totalBudget)} icon={Wallet} />
        <StatCard label="Total Spent" value={formatCurrencyShort(totals.totalSpent)} icon={TrendingUp} accent="amber" />
        <StatCard label="Open Pipeline" value={formatCurrencyShort(totals.pipelineValue)} icon={Target} accent="green" />
        <StatCard label="Tender Value" value={formatCurrencyShort(totals.tenderValue)} icon={FileText} accent="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Project Budget vs Spent">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={budgetVsSpent}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v)} width={70} />
              <Tooltip formatter={(v) => formatCurrencyShort(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="budget" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expenses by Category">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} label={(e) => e.name}>
                {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrencyShort(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lead Pipeline Funnel">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={leadFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Campaign Performance (Leads)">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={campaignPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tender Value by Category">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={tenderByCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrencyShort(v)} width={70} />
              <Tooltip formatter={(v) => formatCurrencyShort(v)} />
              <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Headcount by Department">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={headcountByDept} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={95} label={(e) => `${e.name} (${e.value})`}>
                {headcountByDept.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
