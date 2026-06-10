import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import Logo from '../ui/Logo';
import { NAV_GROUPS } from '../../lib/nav';
import { hasAccess } from '../../lib/access';
import { useAuth } from '../../context/AuthContext';
import { playChatChime } from '../../lib/sound';
import api from '../../api/client';

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const role = user?.role;
  const [chatUnread, setChatUnread] = useState(0);
  const prevUnreadRef = useRef(null); // null until first load, so we don't chime on mount

  // Poll total unread chat so the Chat nav item can show a badge, and play a
  // chime whenever the count rises (a new message arrived). The Chat page
  // dispatches 'chat-unread-changed' when it reads messages, for a snappy refresh.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get('/chat/unread').then((r) => {
        if (!alive) return;
        const total = r.data.total || 0;
        if (prevUnreadRef.current !== null && total > prevUnreadRef.current) playChatChime();
        prevUnreadRef.current = total;
        setChatUnread(total);
      }).catch(() => {});
    load();
    const id = setInterval(load, 10000);
    window.addEventListener('chat-unread-changed', load);
    return () => { alive = false; clearInterval(id); window.removeEventListener('chat-unread-changed', load); };
  }, []);

  // Filter groups/items by the user's access matrix.
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => item.module === null || hasAccess(item.module, role)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4">
          <Logo />
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {g.group}
              </p>
              <div className="space-y-0.5">
                {g.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-brand-700 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    <span className="flex-1">{item.label}</span>
                    {item.path === '/chat' && chatUnread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {chatUnread > 9 ? '9+' : chatUnread}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400">
          © {new Date().getFullYear()} GPSFDK.com
        </div>
      </aside>
    </>
  );
}
