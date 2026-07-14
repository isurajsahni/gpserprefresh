import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Text is optional when the message carries an image or a voice clip.
    text: { type: String, default: '', trim: true },
    // Optional attachments.
    imageUrl: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    audioDuration: { type: Number, default: 0 }, // seconds, for the player label
    // Users @-mentioned in the text.
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // The message this one is replying to (quoted), if any.
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
