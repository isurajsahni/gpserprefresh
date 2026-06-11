import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Plus, Send, MessageSquarePlus, Search, Lock, UserPlus, Users } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUserOptions } from '../hooks/useFetch';
import { Avatar, Spinner, EmptyState } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { playChatChime } from '../lib/sound';
import { format } from 'date-fns';

// Let the sidebar badge refresh promptly when we read/receive chat.
const pingUnread = () => window.dispatchEvent(new Event('chat-unread-changed'));

export default function Chat() {
  const { user } = useAuth();
  const users = useUserOptions();
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState({}); // { channelId: count }
  const [newChannel, setNewChannel] = useState(null); // {name, description, isOpen} | null
  const [dmOpen, setDmOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false); // add-people-to-channel modal
  const [userQuery, setUserQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');

  const activeRef = useRef(null);
  const lastTsRef = useRef(null);
  const bottomRef = useRef(null);
  const seenRef = useRef(new Set()); // message ids already shown (dedupe poll/send races)
  const sendingRef = useRef(false); // synchronous guard against double-submit

  const active = channels.find((c) => c._id === activeId);

  // Append messages we don't already have (dedupe by _id), advancing the poll
  // cursor. Returns the genuinely-new messages so callers can chime once only.
  const addMessages = useCallback((incoming) => {
    const fresh = incoming.filter((m) => m && !seenRef.current.has(m._id));
    if (!fresh.length) return [];
    fresh.forEach((m) => seenRef.current.add(m._id));
    setMessages((prev) => [...prev, ...fresh]);
    for (const m of fresh) {
      if (!lastTsRef.current || new Date(m.createdAt) > new Date(lastTsRef.current)) {
        lastTsRef.current = m.createdAt;
      }
    }
    return fresh;
  }, []);

  // Load channel list (and auto-select the first on initial load).
  const loadChannels = useCallback(async (selectFirst = false) => {
    const { data } = await api.get('/chat/channels');
    setChannels(data);
    if (selectFirst && data.length && !activeRef.current) {
      activeRef.current = data[0]._id;
      setActiveId(data[0]._id);
    }
  }, []);

  // Pull per-channel unread counts.
  const loadUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/unread');
      setUnread(data.byChannel || {});
    } catch {
      /* ignore */
    }
  }, []);

  // Mark a channel's notifications read and optimistically clear its badge.
  const markRead = useCallback((channelId) => {
    if (!channelId) return;
    setUnread((u) => {
      if (!u[channelId]) return u;
      const next = { ...u };
      delete next[channelId];
      return next;
    });
    api.patch(`/chat/channels/${channelId}/read`).then(pingUnread).catch(() => {});
  }, []);

  useEffect(() => {
    loadChannels(true);
    loadUnread();
    const id = setInterval(() => {
      loadChannels(false);
      loadUnread();
    }, 15000);
    return () => clearInterval(id);
  }, [loadChannels, loadUnread]);

  // Full load on channel switch + poll for new messages every 3s.
  useEffect(() => {
    if (!activeId) return;
    activeRef.current = activeId;
    let alive = true;

    const fullLoad = async () => {
      const { data } = await api.get(`/chat/channels/${activeId}/messages`);
      if (!alive) return;
      seenRef.current = new Set(data.map((m) => m._id));
      setMessages(data);
      lastTsRef.current = data.length ? data[data.length - 1].createdAt : null;
      markRead(activeId);
    };

    const poll = async () => {
      if (!lastTsRef.current) return fullLoad();
      const { data } = await api.get(`/chat/channels/${activeId}/messages?after=${encodeURIComponent(lastTsRef.current)}`);
      if (!alive || !data.length) return;
      const fresh = addMessages(data);
      // A message from someone else arrived in the open conversation: chime and
      // mark it read (so the unread badge/total don't also count it).
      if (fresh.some((m) => String(m.sender?._id) !== String(user._id))) {
        playChatChime();
        markRead(activeId);
      }
    };

    fullLoad();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [activeId, markRead, user._id, addMessages]);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sendingRef.current) return; // ref guard: blocks a fast double-submit synchronously
    sendingRef.current = true;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/channels/${activeId}/messages`, { text: body });
      addMessages([data]); // deduped — a racing poll can't add it twice
      setText('');
      loadChannels(false);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const createChannel = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/chat/channels', newChannel);
    setNewChannel(null);
    await loadChannels(false);
    setActiveId(data._id);
  };

  const startDm = async (userId) => {
    const { data } = await api.post('/chat/direct', { userId });
    setDmOpen(false);
    setUserQuery('');
    await loadChannels(false);
    setActiveId(data._id);
  };

  const addMember = async (userId) => {
    const { data } = await api.post(`/chat/channels/${activeId}/members`, { userId });
    setChannels((prev) => prev.map((c) => (c._id === data._id ? { ...c, ...data } : c)));
    setAddQuery('');
  };

  const channelList = channels.filter((c) => c.type === 'channel');
  const dmList = channels.filter((c) => c.type === 'direct');
  const filteredUsers = users.filter((u) => u._id !== user._id && u.name.toLowerCase().includes(userQuery.toLowerCase()));
  const memberIds = new Set((active?.members || []).map((m) => String(m._id || m)));
  const addableUsers = users.filter(
    (u) => !memberIds.has(String(u._id)) && u.name.toLowerCase().includes(addQuery.toLowerCase())
  );

  const Badge = ({ id }) =>
    unread[id] ? (
      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
        {unread[id] > 9 ? '9+' : unread[id]}
      </span>
    ) : null;

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Left rail */}
      <div className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="font-bold text-gray-900">Messages</h2>
          <p className="text-xs text-gray-400">Team chat</p>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Channels</span>
            <button onClick={() => setNewChannel({ name: '', description: '', isOpen: true })} className="text-gray-400 hover:text-brand-700"><Plus size={15} /></button>
          </div>
          {channelList.map((c) => (
            <button key={c._id} onClick={() => setActiveId(c._id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${activeId === c._id ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
              {c.isOpen ? <Hash size={15} /> : <Lock size={13} />}
              <span className={`truncate ${unread[c._id] && activeId !== c._id ? 'font-semibold text-gray-900' : ''}`}>{c.displayName}</span>
              {activeId !== c._id && <Badge id={c._id} />}
            </button>
          ))}

          <div className="mb-1 mt-4 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Direct Messages</span>
            <button onClick={() => setDmOpen(true)} className="text-gray-400 hover:text-brand-700"><MessageSquarePlus size={15} /></button>
          </div>
          {dmList.map((c) => (
            <button key={c._id} onClick={() => setActiveId(c._id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${activeId === c._id ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Avatar name={c.displayName} size={22} />
              <span className={`truncate ${unread[c._id] && activeId !== c._id ? 'font-semibold text-gray-900' : ''}`}>{c.displayName}</span>
              {activeId !== c._id && <Badge id={c._id} />}
            </button>
          ))}
          {dmList.length === 0 && <p className="px-2 py-1 text-xs text-gray-400">No direct messages yet</p>}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3">
              {active.type === 'channel' ? <Hash size={18} className="text-gray-400" /> : <Avatar name={active.displayName} size={26} />}
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">{active.displayName}</h3>
                {active.description && <p className="truncate text-xs text-gray-400">{active.description}</p>}
              </div>
              {active.type === 'channel' && (
                <button
                  onClick={() => { setAddQuery(''); setAddOpen(true); }}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <Users size={14} />
                  {(active.members?.length || 0) > 0 && <span>{active.members.length}</span>}
                  <UserPlus size={14} /> Add
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.length === 0 && <p className="py-10 text-center text-sm text-gray-400">No messages yet — say hello! 👋</p>}
              {messages.map((m) => {
                const mine = String(m.sender?._id) === String(user._id);
                return (
                  <div key={m._id} className="flex gap-3">
                    <Avatar name={m.sender?.name} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-gray-900">{mine ? 'You' : m.sender?.name}</span>
                        <span className="text-[11px] text-gray-400">{format(new Date(m.createdAt), 'dd MMM, h:mm a')}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{m.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="flex items-center gap-2 border-t border-gray-200 px-4 py-3">
              <input className="input" placeholder={`Message ${active.type === 'channel' ? '#' + active.displayName : active.displayName}`}
                value={text} onChange={(e) => setText(e.target.value)} />
              <button disabled={sending || !text.trim()} className="btn-primary">
                {sending ? <Spinner className="h-5 w-5 text-white" /> : <Send size={18} />}
              </button>
            </form>
          </>
        ) : (
          <EmptyState title="Select a conversation" hint="Pick a channel or start a direct message." icon={Hash} />
        )}
      </div>

      {/* New channel */}
      <Modal open={!!newChannel} onClose={() => setNewChannel(null)} title="Create a channel"
        footer={<><button onClick={() => setNewChannel(null)} className="btn-secondary">Cancel</button><button form="ch-form" className="btn-primary">Create</button></>}>
        <form id="ch-form" onSubmit={createChannel} className="space-y-3">
          <div><label className="label">Name</label><input required className="input" placeholder="e.g. engineering" value={newChannel?.name || ''} onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })} /></div>
          <div><label className="label">Description <span className="font-normal text-gray-400">(optional)</span></label><input className="input" value={newChannel?.description || ''} onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })} /></div>
          <label className="flex items-start gap-2 rounded-lg border border-gray-200 p-3 text-sm">
            <input type="checkbox" className="mt-0.5" checked={newChannel?.isOpen === false} onChange={(e) => setNewChannel({ ...newChannel, isOpen: !e.target.checked })} />
            <span>
              <span className="font-medium text-gray-900">Make private</span>
              <span className="block text-xs text-gray-400">Only people you add can see and join this channel. Open channels are visible to everyone.</span>
            </span>
          </label>
        </form>
      </Modal>

      {/* New DM */}
      <Modal open={dmOpen} onClose={() => setDmOpen(false)} title="Start a direct message">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input pl-9" placeholder="Search people…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} autoFocus />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {filteredUsers.map((u) => (
            <button key={u._id} onClick={() => startDm(u._id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50">
              <Avatar name={u.name} size={32} />
              <div><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.department}</p></div>
            </button>
          ))}
          {filteredUsers.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No people found</p>}
        </div>
      </Modal>

      {/* Add people to channel */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Add people to ${active ? '#' + active.displayName : 'channel'}`}>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input className="input pl-9" placeholder="Search people…" value={addQuery} onChange={(e) => setAddQuery(e.target.value)} autoFocus />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {addableUsers.map((u) => (
            <button key={u._id} onClick={() => addMember(u._id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-50">
              <Avatar name={u.name} size={32} />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.department}</p></div>
              <UserPlus size={16} className="text-brand-700" />
            </button>
          ))}
          {addableUsers.length === 0 && <p className="py-6 text-center text-sm text-gray-400">Everyone's already here</p>}
        </div>
        {active?.members?.length > 0 && (
          <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
            {active.members.length} member{active.members.length === 1 ? '' : 's'}: {active.members.map((m) => m.name).filter(Boolean).join(', ')}
          </p>
        )}
      </Modal>
    </div>
  );
}
