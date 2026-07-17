import { useEffect, useState } from 'react';
import * as Icons from 'lucide-react';
import api from '../api/client';
import { Avatar } from './ui/primitives';
import { ROLE_LABELS } from '../lib/access';

// Live presence list. Someone is "online" from the moment they check in until
// they check out (or the server's auto-checkout closes their session), so this
// polls rather than reading the one-shot dashboard payload.
const POLL_MS = 30000;

export default function OnlineUsers() {
  const [presence, setPresence] = useState(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const { data } = await api.get('/attendance/presence');
        if (alive) setPresence(data);
      } catch {
        /* keep the last known list rather than blanking the panel */
      }
    };
    load();
    const id = setInterval(load, POLL_MS);
    // Your own check-in/out should land immediately, not on the next poll.
    window.addEventListener('attendance-changed', load);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('attendance-changed', load);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const people = presence?.people || [];
  const sorted = [...people].sort((a, b) => Number(b.online) - Number(a.online));

  return (
    <div className="card">
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <Icons.Users size={18} className="text-brand-700" />
        <h3 className="font-semibold text-gray-900">Who’s online</h3>
        <span className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {presence?.onlineCount ?? 0} of {people.length}
        </span>
      </div>
      <div className="max-h-80 divide-y divide-gray-50 overflow-y-auto">
        {sorted.map((p) => (
          <div key={p._id} className="flex items-center gap-3 px-5 py-2.5">
            <div className="relative shrink-0">
              <Avatar name={p.name} src={p.avatar} size={32} />
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                  p.online ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm ${p.online ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                {p.name}
              </p>
              <p className="truncate text-xs text-gray-400">{ROLE_LABELS[p.role] || p.role}</p>
            </div>
            <span className={`text-xs ${p.online ? 'font-medium text-green-600' : 'text-gray-400'}`}>
              {p.online ? (p.since ? `Since ${p.since}` : 'Online') : 'Offline'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
