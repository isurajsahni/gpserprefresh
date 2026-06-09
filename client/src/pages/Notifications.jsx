import { Bell, CheckCheck, Calendar, FileText, Receipt, Megaphone, Cake, ListChecks } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import { Loading, EmptyState, PageHeader } from '../components/ui/primitives';
import { timeAgo } from '../lib/format';
import api from '../api/client';

const ICONS = { task: ListChecks, leave: Calendar, tender: FileText, announcement: Megaphone, expense: Receipt, birthday: Cake };

export default function Notifications() {
  const { data, loading, refetch } = useFetch('/notifications', []);
  if (loading) return <Loading />;
  const notes = data || [];

  const markAll = async () => { await api.patch('/notifications/read-all'); refetch(); };
  const markOne = async (id) => { await api.patch(`/notifications/${id}/read`); refetch(); };

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Personal alerts & company broadcasts">
        <button onClick={markAll} className="btn-secondary"><CheckCheck size={18} /> Mark all read</button>
      </PageHeader>

      {notes.length === 0 ? <EmptyState title="No notifications" icon={Bell} /> : (
        <div className="card divide-y divide-gray-50">
          {notes.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div key={n._id} onClick={() => !n.read && markOne(n._id)}
                className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-gray-50 ${!n.read ? 'bg-brand-50/40' : ''}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${!n.read ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-gray-900">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  </div>
                  <p className="text-sm text-gray-500">{n.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{timeAgo(n.createdAt)}{n.recipient ? '' : ' · Broadcast'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
