import mongoose from 'mongoose';
import { Channel } from '../models/Channel.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendMail, unseenChatEmail } from '../utils/mailer.js';

// Ensures a default open #general channel exists.
async function ensureGeneral() {
  let general = await Channel.findOne({ type: 'channel', name: 'general' });
  if (!general) {
    general = await Channel.create({ name: 'general', description: 'Company-wide chatter', type: 'channel', isOpen: true });
  }
  return general;
}

// A user can see open channels, channels they're a member of, and their DMs.
function visibilityFilter(userId) {
  return {
    $or: [
      { type: 'channel', isOpen: true },
      { members: userId },
    ],
  };
}

// Build a display label for a channel relative to the requesting user.
function decorate(channel, userId) {
  const obj = channel.toObject ? channel.toObject() : channel;
  if (obj.type === 'direct') {
    const other = (obj.members || []).find((m) => String(m._id) !== String(userId));
    obj.displayName = other?.name || 'Direct message';
    obj.otherUser = other || null;
  } else {
    obj.displayName = obj.name;
  }
  return obj;
}

// GET /api/chat/channels
export const listChannels = asyncHandler(async (req, res) => {
  await ensureGeneral();
  const channels = await Channel.find(visibilityFilter(req.auth.id))
    .populate('members', 'name role avatar')
    .sort('-lastMessageAt');
  res.json(channels.map((c) => decorate(c, req.auth.id)));
});

// POST /api/chat/channels  { name, description, members?[] }
export const createChannel = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) throw new ApiError(400, 'Channel name is required');
  const exists = await Channel.findOne({ type: 'channel', name });
  if (exists) throw new ApiError(409, 'A channel with that name already exists');

  const members = Array.from(new Set([req.auth.id, ...(req.body.members || [])]));
  const channel = await Channel.create({
    name,
    description: req.body.description || '',
    type: 'channel',
    isOpen: req.body.isOpen !== false,
    members,
    createdBy: req.auth.id,
  });
  const populated = await Channel.findById(channel._id).populate('members', 'name role avatar');
  res.status(201).json(decorate(populated, req.auth.id));
});

// POST /api/chat/direct  { userId }  -> get or create a 1:1 DM channel
export const openDirect = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId || String(userId) === String(req.auth.id)) throw new ApiError(400, 'Pick another user to message');
  const other = await User.findById(userId).select('name role');
  if (!other) throw new ApiError(404, 'User not found');

  let channel = await Channel.findOne({
    type: 'direct',
    members: { $all: [req.auth.id, userId], $size: 2 },
  });
  if (!channel) {
    channel = await Channel.create({ type: 'direct', isOpen: false, members: [req.auth.id, userId], createdBy: req.auth.id });
  }
  const populated = await Channel.findById(channel._id).populate('members', 'name role avatar');
  res.status(201).json(decorate(populated, req.auth.id));
});

// Confirms the user may access a channel.
async function assertAccess(channelId, userId) {
  const channel = await Channel.findById(channelId);
  if (!channel) throw new ApiError(404, 'Channel not found');
  const isMember = channel.members.some((m) => String(m) === String(userId));
  const isOpen = channel.type === 'channel' && channel.isOpen;
  if (!isMember && !isOpen) throw new ApiError(403, 'You are not a member of this channel');
  return channel;
}

// Populate spec for a quoted reply (the original message's text/attachment + author name).
const REPLY_POPULATE = { path: 'replyTo', select: 'text imageUrl audioUrl sender', populate: { path: 'sender', select: 'name' } };

// GET /api/chat/channels/:id/messages?after=<ISO>
export const listMessages = asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.auth.id);
  const filter = { channel: req.params.id };
  if (req.query.after) filter.createdAt = { $gt: new Date(req.query.after) };
  const messages = await Message.find(filter)
    .populate('sender', 'name role avatar')
    .populate('mentions', 'name')
    .populate(REPLY_POPULATE)
    .sort('createdAt')
    .limit(200);
  res.json(messages);
});

// Who should be notified about a new message in this channel (everyone but the sender).
async function recipientsFor(channel, senderId) {
  if (channel.type === 'channel' && channel.isOpen) {
    // Open channels reach everyone active in the company.
    const all = await User.find({ status: { $ne: 'Inactive' } }).select('_id');
    return all.map((u) => u._id).filter((id) => String(id) !== String(senderId));
  }
  return (channel.members || []).filter((m) => String(m) !== String(senderId));
}

// A short preview line for notifications/quoted replies.
function previewOf(message) {
  if (message.text) return message.text.length > 140 ? `${message.text.slice(0, 140)}…` : message.text;
  if (message.imageUrl) return '📷 Photo';
  if (message.audioUrl) return '🎤 Voice message';
  return '';
}

// Fan out a chat notification to every recipient so it surfaces in their bell/inbox.
// Recipients who were @-mentioned (or everyone, on @all) get a "mentioned you" title.
async function notifyRecipients(channel, message, senderName) {
  const recipients = await recipientsFor(channel, message.sender);
  if (!recipients.length) return;
  const mentioned = new Set((message.mentions || []).map((m) => String(m)));
  const all = !!message.mentionAll;
  const where = channel.type === 'direct' ? '' : ` in #${channel.name}`;
  const label = channel.type === 'direct' ? senderName : `${senderName}${where}`;
  const snippet = previewOf(message);
  await Notification.insertMany(
    recipients.map((rid) => ({
      title: all || mentioned.has(String(rid)) ? `${senderName} mentioned you${where}` : label,
      message: snippet,
      type: 'chat',
      channel: channel._id,
      sender: message.sender,
      recipient: rid,
    }))
  );
}

// POST /api/chat/channels/:id/messages  { text?, imageUrl?, audioUrl?, audioDuration?, mentions?, replyTo? }
export const sendMessage = asyncHandler(async (req, res) => {
  const channel = await assertAccess(req.params.id, req.auth.id);
  const text = (req.body.text || '').trim();
  const imageUrl = (req.body.imageUrl || '').trim();
  const audioUrl = (req.body.audioUrl || '').trim();
  const audioDuration = Number(req.body.audioDuration) || 0;
  if (!text && !imageUrl && !audioUrl) throw new ApiError(400, 'Message cannot be empty');

  // De-dupe mention ids and keep only valid ObjectIds.
  const mentions = [...new Set((Array.isArray(req.body.mentions) ? req.body.mentions : []).map(String))]
    .filter((id) => mongoose.isValidObjectId(id));
  const mentionAll = !!req.body.mentionEveryone;

  // Optional quoted reply — only accept an id that belongs to this channel.
  let replyTo = null;
  if (req.body.replyTo) {
    const parent = await Message.findById(req.body.replyTo).select('channel');
    if (parent && String(parent.channel) === String(req.params.id)) replyTo = parent._id;
  }

  const msg = await Message.create({
    channel: req.params.id, sender: req.auth.id, text, imageUrl, audioUrl, audioDuration, mentions, mentionAll, replyTo,
  });
  await Channel.findByIdAndUpdate(req.params.id, { lastMessageAt: new Date() });
  const populated = await Message.findById(msg._id)
    .populate('sender', 'name role avatar')
    .populate('mentions', 'name')
    .populate(REPLY_POPULATE);

  // Notify everyone else in the conversation (don't fail the send if this errors).
  notifyRecipients(channel, msg, populated.sender?.name || 'Someone').catch((e) =>
    console.error('chat notify error:', e.message)
  );

  res.status(201).json(populated);
});

// PUT /api/chat/messages/:id  { text }  -> edit your own message's text.
export const editMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw new ApiError(404, 'Message not found');
  if (String(msg.sender) !== String(req.auth.id)) throw new ApiError(403, 'You can only edit your own messages');

  const text = (req.body.text || '').trim();
  if (!text && !msg.imageUrl && !msg.audioUrl) throw new ApiError(400, 'Message cannot be empty');

  msg.text = text;
  msg.edited = true;
  await msg.save();
  const populated = await Message.findById(msg._id)
    .populate('sender', 'name role avatar')
    .populate('mentions', 'name')
    .populate(REPLY_POPULATE);
  res.json(populated);
});

// DELETE /api/chat/messages/:id  -> remove your own message (super admin may remove any).
export const deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) throw new ApiError(404, 'Message not found');
  const isOwner = String(msg.sender) === String(req.auth.id);
  if (!isOwner && req.auth.role !== 'super_admin') throw new ApiError(403, 'You can only delete your own messages');

  await msg.deleteOne();
  res.json({ success: true, id: req.params.id });
});

// GET /api/chat/unread -> { total, byChannel: { <channelId>: count } }
// Unread = chat notifications addressed to me that I haven't read yet, grouped by channel.
export const unreadCounts = asyncHandler(async (req, res) => {
  const rows = await Notification.aggregate([
    {
      $match: {
        recipient: new mongoose.Types.ObjectId(req.auth.id),
        type: 'chat',
        read: false,
        channel: { $ne: null },
      },
    },
    { $group: { _id: '$channel', count: { $sum: 1 } } },
  ]);
  const byChannel = {};
  let total = 0;
  for (const r of rows) {
    byChannel[String(r._id)] = r.count;
    total += r.count;
  }
  res.json({ total, byChannel });
});

// PATCH /api/chat/channels/:id/read -> clear my unread chat notifications for this channel.
export const markChannelRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.auth.id, channel: req.params.id, type: 'chat', read: false },
    { read: true }
  );
  res.json({ success: true });
});

// POST /api/chat/channels/:id/members  { members?: [], userId? }  -> add people to a channel.
export const addMembers = asyncHandler(async (req, res) => {
  const channel = await Channel.findById(req.params.id);
  if (!channel) throw new ApiError(404, 'Channel not found');
  if (channel.type !== 'channel') throw new ApiError(400, 'You can only add people to channels');

  const isMember = channel.members.some((m) => String(m) === String(req.auth.id));
  // Anyone may add to open channels; private channels are members- or admin-only.
  if (!channel.isOpen && !isMember && req.auth.role !== 'super_admin') {
    throw new ApiError(403, 'Only members can add people to this channel');
  }

  const ids = Array.isArray(req.body.members)
    ? req.body.members
    : req.body.userId
    ? [req.body.userId]
    : [];
  if (!ids.length) throw new ApiError(400, 'Pick at least one person to add');

  await Channel.findByIdAndUpdate(req.params.id, { $addToSet: { members: { $each: ids } } });
  const populated = await Channel.findById(req.params.id).populate('members', 'name role avatar');
  res.json(decorate(populated, req.auth.id));
});

// How long a chat message may sit unread before we email the recipient a reminder.
const UNSEEN_EMAIL_AFTER_MS = 60 * 60 * 1000; // 1 hour

// Background job: email people who still have chat messages they haven't opened
// after an hour. Each notification is emailed at most once (the `emailed` flag),
// so this reminds without spamming. Meant to run on an interval.
export async function emailUnseenChatDigests() {
  const cutoff = new Date(Date.now() - UNSEEN_EMAIL_AFTER_MS);
  const pending = await Notification.find({
    type: 'chat',
    read: false,
    emailed: { $ne: true },
    recipient: { $ne: null },
    createdAt: { $lt: cutoff },
  }).populate('sender', 'name');
  if (!pending.length) return;

  // Group the unseen notifications by recipient.
  const byRecipient = new Map();
  for (const n of pending) {
    const key = String(n.recipient);
    if (!byRecipient.has(key)) byRecipient.set(key, []);
    byRecipient.get(key).push(n);
  }

  for (const [recipientId, notes] of byRecipient) {
    const recipient = await User.findById(recipientId).select('name email status');
    if (!recipient?.email || recipient.status === 'Inactive') continue;
    const senders = [...new Set(notes.map((n) => n.sender?.name).filter(Boolean))];
    const count = notes.length;
    const { html, text } = unseenChatEmail({ name: recipient.name, count, senders });
    await sendMail({
      to: recipient.email,
      subject: `You have ${count} unread chat message${count === 1 ? '' : 's'} on GPSFDK ERP`,
      html,
      text,
    }).catch((e) => console.error('chat digest send error:', e.message));
  }

  // Mark them emailed regardless of send outcome so we don't re-notify in a loop.
  await Notification.updateMany({ _id: { $in: pending.map((n) => n._id) } }, { emailed: true });
}
