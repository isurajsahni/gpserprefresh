import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    amount: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ['Infrastructure', 'Marketing', 'Software', 'Operations'],
      default: 'Operations',
    },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    receipt: { type: Boolean, default: false },
    receiptUrl: { type: String, default: '' }, // uploaded receipt image
  },
  { timestamps: true }
);

export const Expense = mongoose.model('Expense', expenseSchema);
