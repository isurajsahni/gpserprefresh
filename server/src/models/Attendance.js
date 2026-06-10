import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    checkIn: { type: String, default: '' },
    checkOut: { type: String, default: '' },
    status: { type: String, enum: ['Present', 'Late', 'Absent'], default: 'Present' },
    hoursWorked: { type: Number, default: 0 },
    // Live-session tracking: true while the user is on the clock. lastSeen is
    // refreshed by the client heartbeat; if it goes stale (app closed) the
    // session is auto-clocked-out using lastSeen as the end time.
    clockedIn: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
