import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, default: '' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date, default: Date.now },
    priority: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notice = mongoose.model('Notice', noticeSchema);
