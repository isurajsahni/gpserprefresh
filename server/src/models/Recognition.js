import mongoose from 'mongoose';

const recognitionSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true }, // "2026-05" (EOM) or "2026" (EOY)
    points: { type: Number, default: 0 },
    achievements: [{ type: String }],
  },
  { timestamps: true }
);

recognitionSchema.index({ employee: 1, period: 1 }, { unique: true });

export const Recognition = mongoose.model('Recognition', recognitionSchema);
