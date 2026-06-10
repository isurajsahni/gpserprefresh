import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' }, // channels have a name; DMs derive it from members
    description: { type: String, default: '' },
    type: { type: String, enum: ['channel', 'direct'], default: 'channel' },
    // Open channels are visible to everyone; otherwise visibility is by membership.
    isOpen: { type: Boolean, default: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Channel = mongoose.model('Channel', channelSchema);
