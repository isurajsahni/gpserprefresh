import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const Holiday = mongoose.model('Holiday', holidaySchema);
