import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/accessMatrix.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    employeeId: { type: String, unique: true, sparse: true },
    // Work-shift timing (HH:mm). 'Late' on check-in is computed against shiftStart.
    shiftStart: { type: String, default: '09:30' },
    shiftEnd: { type: String, default: '18:30' },
    department: { type: String, default: 'General' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    joinDate: { type: Date, default: Date.now },
    salary: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Password-reset OTP (hashed) and its expiry — hidden from normal queries.
    resetOtpHash: { type: String, default: null, select: false },
    resetOtpExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 10);

export const User = mongoose.model('User', userSchema);
