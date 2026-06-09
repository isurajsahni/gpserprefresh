import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['Sick', 'Casual', 'Earned', 'Compensatory', 'Unpaid'],
      default: 'Casual',
    },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    days: { type: Number, default: 1 },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    appliedOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Leave = mongoose.model('Leave', leaveSchema);
