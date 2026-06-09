import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    channel: { type: String, default: '' },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    status: { type: String, enum: ['Draft', 'Active', 'Completed'], default: 'Draft' },
    startDate: { type: Date },
    endDate: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Campaign = mongoose.model('Campaign', campaignSchema);
