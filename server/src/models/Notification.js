import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, default: '' },
    type: {
      type: String,
      enum: ['task', 'leave', 'tender', 'announcement', 'expense', 'birthday'],
      default: 'announcement',
    },
    read: { type: Boolean, default: false },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = broadcast
  },
  { timestamps: true }
);

export const Notification = mongoose.model('Notification', notificationSchema);
