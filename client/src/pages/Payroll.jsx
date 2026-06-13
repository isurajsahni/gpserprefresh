import { useState } from 'react';
import { Wallet, Eye, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { useFetch, useUserOptions } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar, StatCard } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { formatCurrency } from '../lib/format';
import api from '../api/client';

const thisMonth = () => new Date().toISOString().slice(0, 7);
const emptyForm = { employee: '', month: thisMonth(), basic: 0, hra: 0, da: 0, allowances: 0, pf: 0, tds: 0, esi: 0 };
const num = (v) => Number(v) || 0;

export default function Payroll() {
  const { user } = useAuth();
  const writable = canWrite('payroll', user.role);
  const { data, loading, refetch } = useFetch('/payroll', []);
  const users = useUserOptions();
  const [view, setView] = useState(null);
  const [modal, setModal] = useState(null); // { id } | { id: null }
  const [form, setForm] = useState(emptyForm);
  const [gen, setGen] = useState(null); // { month } | null
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  const rows = data || [];
  const totalNet = rows.reduce((s, r) => s + r.netPay, 0);
  const paid = rows.filter((r) => r.status === 'Paid').length;

  // Live totals for the form preview (server recomputes authoritatively).
  const gross = num(form.basic) + num(form.hra) + num(form.da) + num(form.allowances);
  const net = gross - (num(form.pf) + num(form.tds) + num(form.esi));

  const openAdd = () => { setError(''); setForm(emptyForm); setModal({ id: null }); };
  const openEdit = (p) => {
    setError('');
    setForm({
      employee: p.employee?._id || p.employee || '', month: p.month,
      basic: p.basic, hra: p.hra, da: p.da, allowances: p.allowances, pf: p.pf, tds: p.tds, esi: p.esi,
    });
    setModal({ id: p._id });
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modal.id) await api.put(`/payroll/${modal.id}`, form);
      else await api.post('/payroll', form);
      setModal(null);
      refetch();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm('Delete this payslip?')) return;
    await api.delete(`/payroll/${id}`);
    refetch();
  };

  const markPaid = async (id) => {
    await api.put(`/payroll/${id}`, { status: 'Paid', paidOn: new Date() });
    refetch();
  };

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(''); setError('');
    try {
      const { data: r } = await api.post('/payroll/generate', { month: gen.month });
      setGen(null);
      setMsg(`Generated ${r.created} payslip${r.created === 1 ? '' : 's'} for ${r.month}${r.skipped ? ` · skipped ${r.skipped} (already done or no salary set)` : ''}.`);
      refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Plain function (not a component) so inputs don't remount/lose focus on each keystroke.
  const field = (k, label) => (
    <div key={k}>
      <label className="label">{label}</label>
      <input type="number" min="0" className="input" value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
    </div>
  );

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Salary breakdowns & payslips">
        {writable && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setError(''); setGen({ month: thisMonth() }); }} className="btn-secondary"><Sparkles size={18} /> Generate</button>
            <button onClick={openAdd} className="btn-primary"><Plus size={18} /> Add Payslip</button>
          </div>
        )}
      </PageHeader>

      {msg && <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">{msg}</div>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Payslips" value={rows.length} icon={Wallet} />
        <StatCard label="Net Payout" value={formatCurrency(totalNet)} icon={Wallet} accent="green" />
        <StatCard label="Paid" value={`${paid}/${rows.length}`} icon={Wallet} accent="purple" />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No payroll records" hint={writable ? 'Use “Generate” to create this month’s payslips, or add one manually.' : undefined} />
      ) : (
        <Table columns={['Employee', 'Month', 'Gross', 'Deductions', 'Net Pay', 'Status', writable ? '' : null].filter((c) => c !== null)}>
          {rows.map((p) => (
            <tr key={p._id} className="hover:bg-gray-50">
              <td className="td"><div className="flex items-center gap-2"><Avatar name={p.employee?.name} src={p.employee?.avatar} size={30} /><span className="font-medium text-gray-900">{p.employee?.name}</span></div></td>
              <td className="td">{p.month}</td>
              <td className="td">{formatCurrency(p.gross)}</td>
              <td className="td text-red-600">-{formatCurrency(p.pf + p.tds + p.esi)}</td>
              <td className="td font-semibold">{formatCurrency(p.netPay)}</td>
              <td className="td"><Badge status={p.status} /></td>
              {writable && (
                <td className="td">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setView(p)} className="btn-ghost btn-sm" title="View payslip"><Eye size={15} /></button>
                    <button onClick={() => openEdit(p)} className="btn-ghost btn-sm" title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => remove(p._id)} className="btn-ghost btn-sm text-red-600" title="Delete"><Trash2 size={15} /></button>
                    {p.status === 'Pending' && <button onClick={() => markPaid(p._id)} className="btn-ghost btn-sm text-green-600">Mark Paid</button>}
                  </div>
                </td>
              )}
              {!writable && (
                <td className="td"><button onClick={() => setView(p)} className="btn-ghost btn-sm"><Eye size={15} /></button></td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {/* View payslip */}
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
            {view.status === 'Paid' && view.paidOn && (
              <p className="mt-2 text-center text-xs text-gray-400">Paid on {new Date(view.paidOn).toLocaleDateString('en-IN')}</p>
            )}
          </div>
        )}
      </Modal>

      {/* Add / edit payslip */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Payslip' : 'Add Payslip'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="pay-form" className="btn-primary">Save</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="pay-form" onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Employee</label>
              <select required className="input" value={form.employee} disabled={!!modal?.id}
                onChange={(e) => setForm({ ...form, employee: e.target.value })}>
                <option value="">— Select employee —</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name} · {u.department}</option>)}
              </select>
            </div>
            <div><label className="label">Month</label><input type="month" required className="input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} /></div>
          </div>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Earnings</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {field('basic', 'Basic')}
            {field('hra', 'HRA')}
            {field('da', 'DA')}
            {field('allowances', 'Allowances')}
          </div>

          <p className="pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Deductions</p>
          <div className="grid grid-cols-3 gap-3">
            {field('pf', 'PF')}
            {field('tds', 'TDS')}
            {field('esi', 'ESI')}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm">
            <span className="text-gray-500">Gross <b className="text-gray-900">{formatCurrency(gross)}</b></span>
            <span className="font-semibold text-brand-800">Net Pay {formatCurrency(net)}</span>
          </div>
        </form>
      </Modal>

      {/* Generate payslips for a month */}
      <Modal open={!!gen} onClose={() => setGen(null)} title="Generate payslips"
        footer={<><button onClick={() => setGen(null)} className="btn-secondary">Cancel</button><button form="gen-form" disabled={busy} className="btn-primary">{busy ? 'Generating…' : 'Generate'}</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="gen-form" onSubmit={generate} className="space-y-3">
          <p className="text-sm text-gray-500">Creates draft payslips for every active employee with a salary set, using a standard breakdown (Basic 50%, HRA 20%, DA 10%, Allowances 20%, PF 12% of basic). Employees who already have a payslip for the month are skipped.</p>
          <div><label className="label">Month</label><input type="month" required className="input" value={gen?.month || ''} onChange={(e) => setGen({ month: e.target.value })} /></div>
        </form>
      </Modal>
    </div>
  );
}
