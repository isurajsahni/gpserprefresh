import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true }, // e.g. "2026-05"
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    gross: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
    paidOn: { type: Date, default: null },
  },
  { timestamps: true }
);

// Always derive gross and net from the components (runs on create and save()).
payrollSchema.pre('save', function (next) {
  this.gross = (this.basic || 0) + (this.hra || 0) + (this.da || 0) + (this.allowances || 0);
  this.netPay = this.gross - ((this.pf || 0) + (this.tds || 0) + (this.esi || 0));
  next();
});

payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

export const Payroll = mongoose.model('Payroll', payrollSchema);
