import mongoose from 'mongoose';

const goodMorningSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    postedAt: { type: Date, default: Date.now },
    isGoodMorning: { type: Boolean, default: true },
    earnedPoint: { type: Boolean, default: false }, // first quality post of the day earns an EOM point
  },
  { timestamps: true }
);

export const GoodMorningMessage = mongoose.model('GoodMorningMessage', goodMorningSchema);
