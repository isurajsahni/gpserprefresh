import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, Bell, Search, LogOut, User as UserIcon, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/access';
import { Avatar } from '../ui/primitives';
import { timeAgo } from '../../lib/format';
import { isChatSoundMuted, setChatSoundMuted, playChatChime } from '../../lib/sound';
import api from '../../api/client';

export default function Header({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [notes, setNotes] = useState([]);
  const [openMenu, setOpenMenu] = useState(null); // 'notif' | 'user'
  const [muted, setMuted] = useState(isChatSoundMuted());
  const ref = useRef();

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setChatSoundMuted(next);
    if (!next) playChatChime(); // preview the sound when turning it back on
  };

  const loadNotifications = () => {
    api.get('/notifications/unread-count').then((r) => setUnread(r.data.count)).catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    // Refresh immediately when chat messages are read elsewhere in the app.
    window.addEventListener('chat-unread-changed', loadNotifications);
    return () => { clearInterval(id); window.removeEventListener('chat-unread-changed', loadNotifications); };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openNotif = async () => {
    if (openMenu === 'notif') return setOpenMenu(null);
    setOpenMenu('notif');
    try {
      const r = await api.get('/notifications');
      setNotes(r.data.slice(0, 6));
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all');
    setUnread(0);
    setNotes((n) => n.map((x) => ({ ...x, read: true })));
  };

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden">
        <Menu size={20} />
      </button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input className="input pl-10" placeholder="Search…" />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2" ref={ref}>
        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={muted ? 'Unmute chat sound' : 'Mute chat sound'}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={openNotif} className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {openMenu === 'notif' && (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <span className="font-semibold text-gray-900">Notifications</span>
                <button onClick={markAll} className="text-xs font-medium text-brand-700 hover:underline">
                  Mark all read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notes.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications</p>}
                {notes.map((n) => {
                  const goChat = () => {
                    setOpenMenu(null);
                    navigate('/chat');
                  };
                  return (
                    <div
                      key={n._id}
                      onClick={n.type === 'chat' ? goChat : undefined}
                      className={`border-b border-gray-50 px-4 py-3 ${!n.read ? 'bg-brand-50/40' : ''} ${n.type === 'chat' ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.message}</p>
                      <p className="mt-1 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
              <Link to="/notifications" onClick={() => setOpenMenu(null)} className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-brand-700 hover:bg-gray-50">
                View all
              </Link>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-gray-100"
          >
            <Avatar name={user?.name} size={34} />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-gray-900">{user?.name}</p>
              <p className="text-[11px] leading-tight text-gray-400">{ROLE_LABELS[user?.role]}</p>
            </div>
            <ChevronDown size={16} className="hidden text-gray-400 sm:block" />
          </button>
          {openMenu === 'user' && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Link to="/profile" onClick={() => setOpenMenu(null)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <UserIcon size={16} /> My Profile
              </Link>
              <button onClick={doLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
