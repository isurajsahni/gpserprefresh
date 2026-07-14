import { useState, useEffect, useRef, useCallback } from 'react';
import { Hash, Plus, Send, MessageSquarePlus, Search, Lock, UserPlus, Users, Reply, X, ImagePlus, Mic, Square, Trash2, Loader2, AtSign, Pencil } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useUserOptions } from '../hooks/useFetch';
import { Avatar, Spinner, EmptyState } from '../components/ui/primitives';
import Modal from '../components/ui/Modal';
import { playChatChime } from '../lib/sound';
import { fileToCompressedDataUrl } from '../lib/upload';
import { format } from 'date-fns';

// mm:ss label for a voice clip length.
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Could not read recording'));
    r.readAsDataURL(blob);
  });

// Renders message text with @mentions highlighted (bolder/amber when it targets you).
function MessageText({ text, mentions, mentionAll, meId }) {
  if (!text) return null;
  const list = (mentions || []).filter((m) => m?.name);
  const byName = new Map(list.map((m) => [m.name, m]));
  const names = list.map((m) => m.name);
  if (mentionAll) names.push('all', 'everyone'); // @all / @everyone target the whole channel
  if (!names.length) return <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{text}</p>;
  names.sort((a, b) => b.length - a.length);
  const re = new RegExp(`@(${names.map(escapeRegex).join('|')})`, 'g');
  const parts = [];
  let last = 0, match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const mentioned = byName.get(match[1]);
    // @all/@everyone has no user record and targets everyone (including me).
    const isMe = mentioned ? String(mentioned._id) === String(meId) : true;
    parts.push(
      <span key={match.index} className={`rounded px-0.5 font-semibold ${isMe ? 'bg-amber-100 text-amber-800' : 'text-brand-700'}`}>
        {match[0]}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <p className="whitespace-pre-wrap break-words text-sm text-gray-700">{parts}</p>;
}

// Preview line for a quoted reply that may be an attachment rather than text.
const replyPreview = (m) => m?.text || (m?.imageUrl ? '📷 Photo' : m?.audioUrl ? '🎤 Voice message' : '');

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
  const [replyTo, setReplyTo] = useState(null); // message being replied to
  const [editing, setEditing] = useState(null); // { id, text } of message being edited
  const [image, setImage] = useState('');       // pending image attachment url
  const [audio, setAudio] = useState(null);      // pending voice clip { url, duration }
  const [mentions, setMentions] = useState([]);  // [{ _id, name }] tracked while composing
  const [mentionQuery, setMentionQuery] = useState(null); // current @token being typed, or null
  const [attaching, setAttaching] = useState(false); // uploading an image/voice clip
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  const activeRef = useRef(null);
  const lastTsRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null); // hidden image file input
  const seenRef = useRef(new Set()); // message ids already shown (dedupe poll/send races)
  const sendingRef = useRef(false); // synchronous guard against double-submit
  const mediaRef = useRef(null); // MediaRecorder
  const streamRef = useRef(null); // mic stream (to stop tracks)
  const chunksRef = useRef([]); // recorded audio chunks
  const recTimerRef = useRef(null); // 1s tick interval
  const recStartRef = useRef(0); // recording start timestamp
  const cancelRecRef = useRef(false); // set when a recording is discarded rather than sent

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

  // Drop any in-progress draft when switching conversations.
  useEffect(() => {
    setReplyTo(null); setEditing(null); setText(''); setImage(''); setAudio(null); setMentions([]); setMentionQuery(null);
  }, [activeId]);

  // Stop the mic and timers if the component unmounts mid-recording.
  useEffect(() => () => {
    clearInterval(recTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startReply = (m) => {
    setReplyTo(m);
    inputRef.current?.focus();
  };

  // ── Edit / delete own messages ───────────────────────────────────────
  const saveEdit = async () => {
    const body = (editing?.text || '').trim();
    const target = messages.find((m) => m._id === editing.id);
    if (!body && !target?.imageUrl && !target?.audioUrl) return; // nothing left to keep
    const { data } = await api.put(`/chat/messages/${editing.id}`, { text: body });
    setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
    setEditing(null);
  };

  const removeMessage = async (id) => {
    if (!confirm('Delete this message?')) return;
    await api.delete(`/chat/messages/${id}`);
    seenRef.current.delete(id);
    setMessages((prev) => prev.filter((m) => m._id !== id));
    if (editing?.id === id) setEditing(null);
  };

  // ── Composer: @mentions ──────────────────────────────────────────────
  // Candidate people for the current @token (null token = dropdown hidden).
  // A special "Everyone" (@all) entry leads the list when the token matches.
  const mentionMatches = mentionQuery == null ? [] :
    users.filter((u) => u._id !== user._id && u.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6);
  const showEveryone = mentionQuery != null &&
    ('all'.startsWith(mentionQuery.toLowerCase()) || 'everyone'.startsWith(mentionQuery.toLowerCase()));
  const mentionCandidates = mentionQuery == null ? []
    : [...(showEveryone ? [{ _id: '__all__', name: 'all', label: 'Everyone', special: true }] : []), ...mentionMatches];

  const onTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    // Detect an @token being typed at the caret (letters/numbers, no spaces yet).
    const caret = e.target.selectionStart ?? val.length;
    const m = val.slice(0, caret).match(/@(\w*)$/);
    setMentionQuery(m ? m[1] : null);
  };

  const pickMention = (u) => {
    setText((val) => val.replace(/@(\w*)$/, `@${u.name} `));
    // @all is not a real user — don't track it as an individual mention.
    if (!u.special) setMentions((prev) => (prev.some((x) => x._id === u._id) ? prev : [...prev, { _id: u._id, name: u.name }]));
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const onComposerKeyDown = (e) => {
    if (mentionCandidates.length && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      pickMention(mentionCandidates[0]);
    } else if (e.key === 'Escape' && mentionQuery != null) {
      setMentionQuery(null);
    }
  };

  // ── Composer: image attachment ───────────────────────────────────────
  const onPickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAttaching(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const { data } = await api.post('/uploads', { image: dataUrl, folder: 'chat' });
      setImage(data.url);
    } catch { /* ignore — user can retry */ } finally { setAttaching(false); }
  };

  // ── Composer: voice message ──────────────────────────────────────────
  const startRecording = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRecRef.current = false;
      mr.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data); };
      mr.onstop = finishRecording;
      mediaRef.current = mr;
      recStartRef.current = Date.now();
      mr.start();
      setRecording(true);
      setRecordSecs(0);
      recTimerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      alert('Microphone access is needed to record a voice message.');
    }
  };

  const stopRecording = () => mediaRef.current?.stop();     // -> finishRecording (upload)
  const cancelRecording = () => { cancelRecRef.current = true; mediaRef.current?.stop(); };

  const finishRecording = async () => {
    clearInterval(recTimerRef.current);
    setRecording(false);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const secs = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (cancelRecRef.current) { cancelRecRef.current = false; return; } // discarded
    const blob = new Blob(chunks, { type: mediaRef.current?.mimeType || 'audio/webm' });
    if (!blob.size) return;
    setAttaching(true);
    try {
      const dataUrl = await blobToDataUrl(blob);
      const { data } = await api.post('/uploads', { file: dataUrl, folder: 'chat-audio' });
      setAudio({ url: data.url, duration: secs });
    } catch { /* ignore */ } finally { setAttaching(false); }
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !image && !audio) || sendingRef.current) return; // ref guard blocks a fast double-submit
    sendingRef.current = true;
    setSending(true);
    try {
      // Only send mention ids whose @Name still appears in the final text.
      const usedMentions = mentions.filter((m) => body.includes(`@${m.name}`)).map((m) => m._id);
      const mentionEveryone = /(^|\s)@(all|everyone)\b/i.test(body);
      const { data } = await api.post(`/chat/channels/${activeId}/messages`, {
        text: body,
        imageUrl: image || '',
        audioUrl: audio?.url || '',
        audioDuration: audio?.duration || 0,
        mentions: usedMentions,
        mentionEveryone,
        replyTo: replyTo?._id || null,
      });
      addMessages([data]); // deduped — a racing poll can't add it twice
      setText(''); setImage(''); setAudio(null); setMentions([]); setMentionQuery(null); setReplyTo(null);
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
              <Avatar name={c.displayName} src={c.otherUser?.avatar} size={22} />
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
              {active.type === 'channel' ? <Hash size={18} className="text-gray-400" /> : <Avatar name={active.displayName} src={active.otherUser?.avatar} size={26} />}
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
                const canDelete = mine || user.role === 'super_admin';
                return (
                  <div key={m._id} className="group flex gap-3">
                    <Avatar name={m.sender?.name} src={m.sender?.avatar} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-gray-900">{mine ? 'You' : m.sender?.name}</span>
                        <span className="text-[11px] text-gray-400">{format(new Date(m.createdAt), 'dd MMM, h:mm a')}</span>
                        {m.edited && <span className="text-[10px] italic text-gray-400">(edited)</span>}
                        <div className="ml-1 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                          <button onClick={() => startReply(m)} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-brand-700">
                            <Reply size={12} /> Reply
                          </button>
                          {mine && (
                            <button onClick={() => setEditing({ id: m._id, text: m.text || '' })} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-brand-700">
                              <Pencil size={12} /> Edit
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => removeMessage(m._id)} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-red-600">
                              <Trash2 size={12} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                      {m.replyTo && (
                        <div className="mt-1 flex items-center gap-1.5 rounded border-l-2 border-brand-400 bg-gray-50 px-2 py-1 text-xs">
                          <Reply size={11} className="shrink-0 text-brand-500" />
                          <span className="font-semibold text-gray-600">{m.replyTo.sender?.name || 'Unknown'}</span>
                          <span className="truncate text-gray-500">{replyPreview(m.replyTo)}</span>
                        </div>
                      )}
                      {editing?.id === m._id ? (
                        <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="mt-1 flex items-center gap-2">
                          <input autoFocus className="input" value={editing.text}
                            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); }} />
                          <button type="submit" className="btn-primary btn-sm">Save</button>
                          <button type="button" onClick={() => setEditing(null)} className="btn-secondary btn-sm">Cancel</button>
                        </form>
                      ) : (
                        <MessageText text={m.text} mentions={m.mentions} mentionAll={m.mentionAll} meId={user._id} />
                      )}
                      {m.imageUrl && (
                        <a href={m.imageUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                          <img src={m.imageUrl} alt="attachment" className="max-h-64 max-w-[260px] rounded-lg border border-gray-200 object-cover hover:opacity-90" />
                        </a>
                      )}
                      {m.audioUrl && (
                        <div className="mt-1 flex items-center gap-2">
                          <audio controls src={m.audioUrl} className="h-9 max-w-[260px]" />
                          {m.audioDuration > 0 && <span className="text-[11px] text-gray-400">{fmtDur(m.audioDuration)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-200">
              {replyTo && (
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2">
                  <Reply size={14} className="shrink-0 text-brand-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700">
                      Replying to {String(replyTo.sender?._id) === String(user._id) ? 'yourself' : replyTo.sender?.name}
                    </p>
                    <p className="truncate text-xs text-gray-500">{replyPreview(replyTo)}</p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 text-gray-400 hover:text-gray-700" title="Cancel reply">
                    <X size={16} />
                  </button>
                </div>
              )}
              <form onSubmit={send} className="px-4 py-3">
                {/* Pending attachments */}
                {(image || audio || attaching) && (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {image && (
                      <div className="relative">
                        <img src={image} alt="pending" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                        <button type="button" onClick={() => setImage('')} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow hover:bg-red-600" title="Remove image"><X size={12} /></button>
                      </div>
                    )}
                    {audio && (
                      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                        <Mic size={14} className="text-brand-600" />
                        <audio controls src={audio.url} className="h-8 max-w-[200px]" />
                        <span className="text-[11px] text-gray-400">{fmtDur(audio.duration)}</span>
                        <button type="button" onClick={() => setAudio(null)} className="text-gray-400 hover:text-red-600" title="Remove voice message"><Trash2 size={14} /></button>
                      </div>
                    )}
                    {attaching && <span className="flex items-center gap-1.5 text-xs text-gray-400"><Loader2 size={14} className="animate-spin" /> Uploading…</span>}
                  </div>
                )}

                <div className="relative flex items-center gap-2">
                  {/* @mention autocomplete */}
                  {mentionCandidates.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      <p className="flex items-center gap-1 border-b border-gray-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><AtSign size={11} /> Mention</p>
                      {mentionCandidates.map((u) => (
                        <button key={u._id} type="button" onMouseDown={(e) => { e.preventDefault(); pickMention(u); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                          {u.special ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-700"><Users size={14} /></span>
                          ) : (
                            <Avatar name={u.name} src={u.avatar} size={24} />
                          )}
                          <span className="font-medium text-gray-900">{u.special ? 'Everyone' : u.name}</span>
                          <span className="ml-auto text-xs text-gray-400">{u.special ? 'Notify the whole channel' : u.department}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />

                  {recording ? (
                    <div className="flex flex-1 items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
                      </span>
                      <span className="text-sm font-medium text-red-700">Recording… {fmtDur(recordSecs)}</span>
                      <button type="button" onClick={cancelRecording} className="ml-auto text-gray-500 hover:text-gray-700" title="Discard"><Trash2 size={16} /></button>
                      <button type="button" onClick={stopRecording} className="btn-primary btn-sm" title="Stop & attach"><Square size={14} /> Stop</button>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={attaching} className="btn-ghost btn-sm shrink-0 text-gray-500" title="Attach image"><ImagePlus size={18} /></button>
                      <button type="button" onClick={startRecording} disabled={attaching} className="btn-ghost btn-sm shrink-0 text-gray-500" title="Record voice message"><Mic size={18} /></button>
                      <input ref={inputRef} className="input" placeholder={replyTo ? 'Type your reply…' : `Message ${active.type === 'channel' ? '#' + active.displayName : active.displayName}`}
                        value={text} onChange={onTextChange} onKeyDown={onComposerKeyDown} />
                    </>
                  )}

                  <button disabled={sending || recording || (!text.trim() && !image && !audio)} className="btn-primary shrink-0">
                    {sending ? <Spinner className="h-5 w-5 text-white" /> : <Send size={18} />}
                  </button>
                </div>
              </form>
            </div>
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
              <Avatar name={u.name} src={u.avatar} size={32} />
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
              <Avatar name={u.name} src={u.avatar} size={32} />
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
