import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Plus, Send, MessageSquarePlus, Search, Lock } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUserOptions } from '../hooks/useFetch';
import { Avatar, Spinner, EmptyState } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { format } from 'date-fns';

export default function Chat() {
  const { user } = useAuth();
  const users = useUserOptions();
  const [channels, setChannels] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [newChannel, setNewChannel] = useState(null); // {name, description} | null
  const [dmOpen, setDmOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');

  const activeRef = useRef(null);
  const lastTsRef = useRef(null);
  const bottomRef = useRef(null);

  const active = channels.find((c) => c._id === activeId);

  // Load channel list (and auto-select the first on initial load).
  const loadChannels = useCallback(async (selectFirst = false) => {
    const { data } = await api.get('/chat/channels');
    setChannels(data);
    if (selectFirst && data.length && !activeRef.current) {
      activeRef.current = data[0]._id;
      setActiveId(data[0]._id);
    }
  }, []);

  useEffect(() => {
    loadChannels(true);
    const id = setInterval(() => loadChannels(false), 20000);
    return () => clearInterval(id);
  }, [loadChannels]);

  // Full load on channel switch + poll for new messages every 3s.
  useEffect(() => {
    if (!activeId) return;
    activeRef.current = activeId;
    let alive = true;

    const fullLoad = async () => {
      const { data } = await api.get(`/chat/channels/${activeId}/messages`);
      if (!alive) return;
      setMessages(data);
      lastTsRef.current = data.length ? data[data.length - 1].createdAt : null;
    };

    const poll = async () => {
      if (!lastTsRef.current) return fullLoad();
      const { data } = await api.get(`/chat/channels/${activeId}/messages?after=${encodeURIComponent(lastTsRef.current)}`);
      if (!alive || !data.length) return;
      setMessages((prev) => [...prev, ...data]);
      lastTsRef.current = data[data.length - 1].createdAt;
    };

    fullLoad();
    const id = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [activeId]);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/channels/${activeId}/messages`, { text: body });
      setMessages((prev) => [...prev, data]);
      lastTsRef.current = data.createdAt;
      setText('');
      loadChannels(false);
    } finally {
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

  const channelList = channels.filter((c) => c.type === 'channel');
  const dmList = channels.filter((c) => c.type === 'direct');
  const filteredUsers = users.filter((u) => u._id !== user._id && u.name.toLowerCase().includes(userQuery.toLowerCase()));

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
            <button onClick={() => setNewChannel({ name: '', description: '' })} className="text-gray-400 hover:text-brand-700"><Plus size={15} /></button>
          </div>
          {channelList.map((c) => (
            <button key={c._id} onClick={() => setActiveId(c._id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${activeId === c._id ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
              {c.isOpen ? <Hash size={15} /> : <Lock size={13} />} <span className="truncate">{c.displayName}</span>
            </button>
          ))}

          <div className="mb-1 mt-4 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Direct Messages</span>
            <button onClick={() => setDmOpen(true)} className="text-gray-400 hover:text-brand-700"><MessageSquarePlus size={15} /></button>
          </div>
          {dmList.map((c) => (
            <button key={c._id} onClick={() => setActiveId(c._id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${activeId === c._id ? 'bg-brand-700 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>
              <Avatar name={c.displayName} size={22} /> <span className="truncate">{c.displayName}</span>
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
              <div>
                <h3 className="font-semibold text-gray-900">{active.displayName}</h3>
                {active.description && <p className="text-xs text-gray-400">{active.description}</p>}
              </div>
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
          <p className="text-xs text-gray-400">Channels are open to everyone in the company.</p>
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
    </div>
  );
}
