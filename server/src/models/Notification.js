import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, default: '' },
    type: {
      type: String,
      enum: ['task', 'leave', 'tender', 'announcement', 'expense', 'birthday', 'chat'],
      default: 'announcement',
    },
    read: { type: Boolean, default: false },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast
    // For chat notifications: the channel the message belongs to (enables per-channel read/unread).
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', default: null },
    // For chat notifications: who sent the message (used in the unseen-message email digest).
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Whether this notification has already been included in an email reminder.
    emailed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
