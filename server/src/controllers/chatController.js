import { Channel } from '../models/Channel.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

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

// GET /api/chat/channels/:id/messages?after=<ISO>
export const listMessages = asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.auth.id);
  const filter = { channel: req.params.id };
  if (req.query.after) filter.createdAt = { $gt: new Date(req.query.after) };
  const messages = await Message.find(filter).populate('sender', 'name role avatar').sort('createdAt').limit(200);
  res.json(messages);
});

// POST /api/chat/channels/:id/messages  { text }
export const sendMessage = asyncHandler(async (req, res) => {
  await assertAccess(req.params.id, req.auth.id);
  const text = (req.body.text || '').trim();
  if (!text) throw new ApiError(400, 'Message cannot be empty');

  const msg = await Message.create({ channel: req.params.id, sender: req.auth.id, text });
  await Channel.findByIdAndUpdate(req.params.id, { lastMessageAt: new Date() });
  const populated = await Message.findById(msg._id).populate('sender', 'name role avatar');
  res.status(201).json(populated);
});
