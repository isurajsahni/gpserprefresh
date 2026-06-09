import mongoose from 'mongoose';

const tenderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    client: { type: String, default: '' },
    authority: { type: String, default: '' },
    value: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ['Government', 'Private', 'Education', 'Healthcare'],
      default: 'Government',
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Under Evaluation', 'Awarded', 'Closed'],
      default: 'Draft',
    },
    deadline: { type: Date },
    documents: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Tender = mongoose.model('Tender', tenderSchema);
