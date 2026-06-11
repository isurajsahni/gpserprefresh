import { useState } from 'react';
import { Wallet, Eye } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar, StatCard } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatCurrency } from '../lib/format';
import api from '../api/client';

export default function Payroll() {
  const { user } = useAuth();
  const writable = canWrite('payroll', user.role);
  const { data, loading, refetch } = useFetch('/payroll', []);
  const [view, setView] = useState(null);

  if (loading) return <Loading />;
  const rows = data || [];
  const totalNet = rows.reduce((s, r) => s + r.netPay, 0);
  const paid = rows.filter((r) => r.status === 'Paid').length;

  const markPaid = async (id) => {
    await api.put(`/payroll/${id}`, { status: 'Paid', paidOn: new Date() });
    refetch();
  };

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Salary breakdowns & payslips" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Payslips" value={rows.length} icon={Wallet} />
        <StatCard label="Net Payout" value={formatCurrency(totalNet)} icon={Wallet} accent="green" />
        <StatCard label="Paid" value={`${paid}/${rows.length}`} icon={Wallet} accent="purple" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No payroll records" />
      ) : (
        <Table columns={['Employee', 'Month', 'Gross', 'Deductions', 'Net Pay', 'Status', '']}>
          {rows.map((p) => (
            <tr key={p._id} className="hover:bg-gray-50">
              <td className="td"><div className="flex items-center gap-2"><Avatar name={p.employee?.name} src={p.employee?.avatar} size={30} /><span className="font-medium text-gray-900">{p.employee?.name}</span></div></td>
              <td className="td">{p.month}</td>
              <td className="td">{formatCurrency(p.gross)}</td>
              <td className="td text-red-600">-{formatCurrency(p.pf + p.tds + p.esi)}</td>
              <td className="td font-semibold">{formatCurrency(p.netPay)}</td>
              <td className="td"><Badge status={p.status} /></td>
              <td className="td">
                <div className="flex gap-1">
                  <button onClick={() => setView(p)} className="btn-ghost btn-sm"><Eye size={15} /></button>
                  {writable && p.status === 'Pending' && <button onClick={() => markPaid(p._id)} className="btn-ghost btn-sm text-green-600">Mark Paid</button>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={`Payslip · ${view?.month}`}>
        {view && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={view.employee?.name} src={view.employee?.avatar} size={44} />
              <div><p className="font-semibold text-gray-900">{view.employee?.name}</p><p className="text-sm text-gray-500">{view.employee?.department}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-100 bg-gray-100 text-sm">
              {[['Basic', view.basic], ['HRA', view.hra], ['DA', view.da], ['Allowances', view.allowances], ['Gross', view.gross]].map(([k, v]) => (
                <div key={k} className="flex justify-between bg-white px-3 py-2"><span className="text-gray-500">{k}</span><span className="font-medium">{formatCurrency(v)}</span></div>
              ))}
              {[['PF', view.pf], ['TDS', view.tds], ['ESI', view.esi]].map(([k, v]) => (
                <div key={k} className="flex justify-between bg-white px-3 py-2"><span className="text-gray-500">{k}</span><span className="font-medium text-red-600">-{formatCurrency(v)}</span></div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-4 py-3">
              <span className="font-semibold text-brand-800">Net Pay</span>
              <span className="text-lg font-bold text-brand-800">{formatCurrency(view.netPay)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
