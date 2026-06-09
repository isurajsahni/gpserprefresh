import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Personal notifications + broadcasts (recipient null).
const visibleFilter = (userId) => ({ $or: [{ recipient: userId }, { recipient: null }] });

export const listNotifications = asyncHandler(async (req, res) => {
  const notes = await Notification.find(visibleFilter(req.auth.id)).sort('-createdAt').limit(50);
  res.json(notes);
});

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ ...visibleFilter(req.auth.id), read: false });
  res.json({ count });
});

export const markRead = asyncHandler(async (req, res) => {
  const note = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...visibleFilter(req.auth.id) },
    { read: true },
    { new: true }
  );
  if (!note) throw new ApiError(404, 'Notification not found');
  res.json(note);
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ ...visibleFilter(req.auth.id), read: false }, { read: true });
  res.json({ success: true });
});

export const createNotification = asyncHandler(async (req, res) => {
  if (req.auth.role !== 'super_admin') throw new ApiError(403, 'Only admins can broadcast notifications');
  const { title, message, type, recipient } = req.body;
  if (!title) throw new ApiError(400, 'Title is required');
  const note = await Notification.create({ title, message, type, recipient: recipient || null });
  res.status(201).json(note);
});
