import { useState } from 'react';
import { Plus, Check, X, Receipt, Pencil, Trash2 } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../context/AuthContext';
import { getAccess, canWrite } from '../lib/access';
import { Loading, EmptyState, PageHeader, Badge, Avatar, StatCard } from '../components/ui/primitives';
import { Table } from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import ImageUpload from '../components/ui/ImageUpload';
import { formatCurrency, formatDate } from '../lib/format';
import api from '../api/client';

const CATEGORIES = ['Infrastructure', 'Marketing', 'Software', 'Operations'];
const empty = { title: '', amount: 0, category: 'Operations', date: '', receiptUrl: '' };

export default function Finance() {
  const { user } = useAuth();
  const access = getAccess('finance', user.role);
  const canApprove = access === true || access === 'approve';
  const writable = canWrite('finance', user.role);
  const { data, loading, refetch } = useFetch('/expenses', []);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const open = (ex) => {
    setError('');
    if (ex) { setForm({ title: ex.title, amount: ex.amount, category: ex.category, date: ex.date?.slice(0, 10) || '', receiptUrl: ex.receiptUrl || '' }); setModal({ id: ex._id }); }
    else { setForm(empty); setModal({ id: null }); }
  };
  const save = async (e) => {
    e.preventDefault(); setError('');
    const payload = { ...form, receipt: !!form.receiptUrl };
    try {
      if (modal.id) await api.put(`/expenses/${modal.id}`, payload);
      else await api.post('/expenses', payload);
      setModal(null); refetch();
    } catch (err) { setError(err.message); }
  };
  const remove = async (id) => { if (confirm('Delete this expense request?')) { await api.delete(`/expenses/${id}`); refetch(); } };
  const setStatus = async (id, status) => { await api.patch(`/expenses/${id}/status`, { status }); refetch(); };

  if (loading) return <Loading />;
  const expenses = data || [];
  const pending = expenses.filter((e) => e.status === 'Pending');
  const approvedTotal = expenses.filter((e) => e.status === 'Approved').reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title="Finance & Expenses" subtitle={canApprove ? 'Review and approve expense requests' : 'Submit and track your expense requests'}>
        <button onClick={() => open(null)} className="btn-primary"><Plus size={18} /> Request Expense</button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Requests" value={expenses.length} icon={Receipt} />
        <StatCard label="Pending" value={pending.length} icon={Receipt} accent="amber" />
        <StatCard label="Approved Total" value={formatCurrency(approvedTotal)} icon={Receipt} accent="green" />
      </div>

      {expenses.length === 0 ? <EmptyState title="No expenses" hint="Submit your first expense request." /> : (
        <Table columns={[canApprove ? 'Employee' : null, 'Title', 'Category', 'Amount', 'Date', 'Receipt', 'Status', writable ? 'Action' : null].filter((c) => c !== null)}>
          {expenses.map((ex) => (
            <tr key={ex._id} className="hover:bg-gray-50">
              {canApprove && <td className="td"><div className="flex items-center gap-2"><Avatar name={ex.employee?.name} src={ex.employee?.avatar} size={28} /><span className="font-medium text-gray-900">{ex.employee?.name}</span></div></td>}
              <td className="td font-medium text-gray-900">{ex.title}</td>
              <td className="td"><span className="badge-gray">{ex.category}</span></td>
              <td className="td font-semibold">{formatCurrency(ex.amount)}</td>
              <td className="td">{formatDate(ex.date)}</td>
              <td className="td">
                {ex.receiptUrl ? (
                  <a href={ex.receiptUrl} target="_blank" rel="noreferrer" className="inline-block">
                    <img src={ex.receiptUrl} alt="receipt" className="h-9 w-9 rounded border border-gray-200 object-cover hover:opacity-80" />
                  </a>
                ) : ex.receipt ? (
                  <Badge status="Approved">Yes</Badge>
                ) : (
                  <Badge status="Inactive">No</Badge>
                )}
              </td>
              <td className="td"><Badge status={ex.status} /></td>
              {writable && (
                <td className="td">
                  <div className="flex gap-1">
                    {canApprove && ex.status === 'Pending' && (
                      <>
                        <button onClick={() => setStatus(ex._id, 'Approved')} className="btn-ghost btn-sm text-green-600" title="Approve"><Check size={15} /></button>
                        <button onClick={() => setStatus(ex._id, 'Rejected')} className="btn-ghost btn-sm text-red-600" title="Reject"><X size={15} /></button>
                      </>
                    )}
                    <button onClick={() => open(ex)} className="btn-ghost btn-sm" title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => remove(ex._id)} className="btn-ghost btn-sm text-red-600" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.id ? 'Edit Expense' : 'Request Expense'}
        footer={<><button onClick={() => setModal(null)} className="btn-secondary">Cancel</button><button form="exp-form" className="btn-primary">{modal?.id ? 'Save' : 'Submit'}</button></>}>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <form id="exp-form" onSubmit={save} className="space-y-3">
          <div><label className="label">Title</label><input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount (₹)</label><input type="number" required className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><label className="label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div>
            <label className="label">Receipt / screenshot <span className="font-normal text-gray-400">(optional)</span></label>
            <ImageUpload value={form.receiptUrl} onChange={(receiptUrl) => setForm({ ...form, receiptUrl })} folder="receipts" label="Attach receipt" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
