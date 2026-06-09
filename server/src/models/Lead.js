import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // company
    contact: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    source: {
      type: String,
      enum: ['Website', 'Campaign', 'Referral', 'Trade Show', 'LinkedIn'],
      default: 'Website',
    },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Converted', 'Lost'],
      default: 'New',
    },
    value: { type: Number, default: 0 },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastContact: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Lead = mongoose.model('Lead', leadSchema);
