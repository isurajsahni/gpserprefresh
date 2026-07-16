import mongoose from 'mongoose';
import { Leave } from '../models/Leave.js';
import { Expense } from '../models/Expense.js';
import { Attendance } from '../models/Attendance.js';
import { GoodMorningMessage } from '../models/GoodMorningMessage.js';
import { Recognition } from '../models/Recognition.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canWrite } from '../config/accessMatrix.js';
import { computePeriodLeaderboard, recentPeriods } from '../utils/leaderboard.js';

// PATCH /api/leaves/:id/status  { status }
export const setLeaveStatus = asyncHandler(async (req, res) => {
  if (!canWrite('leaves', req.auth.role) || req.access === 'self') {
    throw new ApiError(403, 'Only managers can approve or reject leaves');
  }
  const { status } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) throw new ApiError(400, 'Invalid status');
  const leave = await Leave.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
    'employee',
    'name role department'
  );
  if (!leave) throw new ApiError(404, 'Leave not found');
  res.json(leave);
});

// PATCH /api/expenses/:id/status  { status }
export const setExpenseStatus = asyncHandler(async (req, res) => {
  // Only roles that can approve (operation/super_admin) — 'request' roles cannot.
  if (req.access !== true && req.access !== 'approve') {
    throw new ApiError(403, 'You cannot approve or reject expenses');
  }
  const { status } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) throw new ApiError(400, 'Invalid status');
  const expense = await Expense.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate(
    'employee',
    'name role department'
  );
  if (!expense) throw new ApiError(404, 'Expense not found');
  res.json(expense);
});

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// ── Attendance day rules (minutes since midnight; server runs in IST) ──
const CHECKIN_OPEN = 9 * 60; //           09:00 AM — check-in window opens
const CHECKIN_CUTOFF = 11 * 60; //        11:00 AM — no check-in allowed after this
const AUTO_CHECKOUT = 18 * 60 + 30; //    18:30 — everyone still on the clock is auto-checked-out
const AUTO_CHECKOUT_STR = '18:30';

const timeStr = (d) => d.toTimeString().slice(0, 5);
const nowMinutes = (d) => d.getHours() * 60 + d.getMinutes();

// Minutes between two "HH:mm" clock times (handles crossing midnight).
function minutesBetween(startStr, endStr) {
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// Close an open session at a fixed clock time, crediting hours from check-in to it.
function finalizeAt(record, endStr) {
  const startStr = record.sessionStart || record.checkIn;
  if (startStr) {
    record.hoursWorked = Math.round((minutesBetween(startStr, endStr) / 60) * 10) / 10;
    record.checkOut = endStr;
  } else {
    record.checkOut = record.checkIn || '';
  }
  record.clockedIn = false;
}

// Background job: the 6:30 PM auto-checkout. Anyone still clocked in is checked
// out at 18:30; sessions left open from previous days are closed the same way.
export async function sweepStaleSessions() {
  const { start } = todayRange();

  // Today's open sessions — only once it's 6:30 PM or later.
  if (nowMinutes(new Date()) >= AUTO_CHECKOUT) {
    for (const r of await Attendance.find({ clockedIn: true, date: { $gte: start } })) {
      finalizeAt(r, AUTO_CHECKOUT_STR);
      await r.save();
    }
  }

  // Sessions still flagged open from earlier days (missed their auto-checkout).
  for (const r of await Attendance.find({ clockedIn: true, date: { $lt: start } })) {
    finalizeAt(r, AUTO_CHECKOUT_STR);
    await r.save();
  }

  // Legacy records: checked in, never checked out, not flagged clockedIn.
  const orphans = await Attendance.find({
    date: { $lt: start },
    checkIn: { $ne: '' },
    clockedIn: { $ne: true },
    $or: [{ checkOut: '' }, { checkOut: null }, { checkOut: { $exists: false } }],
  });
  for (const r of orphans) {
    finalizeAt(r, AUTO_CHECKOUT_STR);
    await r.save();
  }
}

// POST /api/attendance/checkin
export const checkIn = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });

  const now = new Date();
  const mins = nowMinutes(now);

  // Check-in window: 9:00 AM – 11:00 AM.
  if (mins < CHECKIN_OPEN) {
    throw new ApiError(403, 'Check-in opens at 9:00 AM.');
  }
  if (mins > CHECKIN_CUTOFF) {
    throw new ApiError(403, 'Check-in is closed for today — the cut-off is 11:00 AM.');
  }
  if (record?.clockedIn) throw new ApiError(409, 'You are already checked in.');
  // One session a day: once you've checked out, you're done until tomorrow.
  if (record?.checkOut) {
    throw new ApiError(409, "You've already checked out today — check-in reopens tomorrow.");
  }

  const checkInStr = timeStr(now);
  const status = 'Present'; // Late status has been removed

  if (!record) {
    const created = await Attendance.create({
      employee: req.auth.id, date: start, checkIn: checkInStr, sessionStart: checkInStr, status, clockedIn: true, lastSeen: now,
    });
    return res.status(201).json(created);
  }
  record.checkIn = checkInStr;
  record.sessionStart = checkInStr;
  record.checkOut = '';
  record.clockedIn = true;
  record.lastSeen = now;
  record.status = status;
  await record.save();
  res.status(201).json(record);
});

// POST /api/attendance/checkout — manual, once per day. Capped at the 6:30 PM auto-checkout.
export const checkOut = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });
  if (!record || !record.clockedIn) throw new ApiError(400, 'You are not checked in.');

  const now = new Date();
  const endStr = nowMinutes(now) > AUTO_CHECKOUT ? AUTO_CHECKOUT_STR : timeStr(now);
  finalizeAt(record, endStr);
  await record.save();
  res.json(record);
});

// POST /api/attendance/heartbeat — presence ping; applies the 6:30 PM auto-checkout lazily.
export const attendanceHeartbeat = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });
  if (!record) return res.json(null);
  if (record.clockedIn) {
    if (nowMinutes(new Date()) >= AUTO_CHECKOUT) finalizeAt(record, AUTO_CHECKOUT_STR);
    else record.lastSeen = new Date();
    await record.save();
  }
  res.json(record);
});

// GET /api/attendance/today — today's record (applies the 6:30 PM auto-checkout lazily).
export const attendanceToday = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });
  if (record?.clockedIn && nowMinutes(new Date()) >= AUTO_CHECKOUT) {
    finalizeAt(record, AUTO_CHECKOUT_STR);
    await record.save();
  }
  res.json(record || null);
});

// GET /api/attendance/summary?from=&to=  -> per-employee working-hours aggregates.
// Team-access roles (super_admin, operation) see everyone; others see themselves.
export const attendanceSummary = asyncHandler(async (req, res) => {
  const teamView = req.access === true || req.access === 'team';

  const from = req.query.from ? new Date(req.query.from) : (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();
  const to = req.query.to ? new Date(req.query.to) : new Date();
  to.setHours(23, 59, 59, 999);

  const match = { date: { $gte: from, $lte: to } };
  if (!teamView) match.employee = new mongoose.Types.ObjectId(req.auth.id);

  const rows = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$employee',
        totalHours: { $sum: { $ifNull: ['$hoursWorked', 0] } },
        daysPresent: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        daysLate: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        daysAbsent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
        records: { $sum: 1 },
      },
    },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'employee' } },
    { $unwind: '$employee' },
    {
      $project: {
        _id: 1,
        totalHours: { $round: ['$totalHours', 1] },
        daysPresent: 1, daysLate: 1, daysAbsent: 1, records: 1,
        avgHours: { $round: [{ $cond: [{ $gt: ['$records', 0] }, { $divide: ['$totalHours', '$records'] }, 0] }, 1] },
        'employee.name': 1, 'employee.role': 1, 'employee.department': 1,
        'employee.shiftStart': 1, 'employee.shiftEnd': 1, 'employee.avatar': 1,
      },
    },
    { $sort: { totalHours: -1 } },
  ]);

  const totals = rows.reduce(
    (a, r) => ({ totalHours: a.totalHours + r.totalHours, daysPresent: a.daysPresent + r.daysPresent, daysLate: a.daysLate + r.daysLate }),
    { totalHours: 0, daysPresent: 0, daysLate: 0 }
  );
  totals.totalHours = Math.round(totals.totalHours * 10) / 10;

  res.json({ from, to, teamView, rows, totals });
});

// GET /api/good-morning  -> today's feed
export const listGoodMorning = asyncHandler(async (_req, res) => {
  const { start, end } = todayRange();
  const feed = await GoodMorningMessage.find({ postedAt: { $gte: start, $lt: end } })
    .populate('user', 'name role avatar')
    .sort('postedAt');
  res.json(feed);
});

// POST /api/good-morning  { message }  -> first quality post of the day earns an EOM point
// The point requires checking in first: you must already have today's check-in
// when you post. Posting without one still reaches the feed, it just earns nothing
// (and doesn't consume the day's point — it stays up for grabs).
export const postGoodMorning = asyncHandler(async (req, res) => {
  const message = (req.body.message || '').trim();
  if (message.length < 5) throw new ApiError(400, 'Message is too short');

  const { start, end } = todayRange();
  const checkedIn = !!(await Attendance.exists({
    employee: req.auth.id,
    date: { $gte: start, $lt: end },
    checkIn: { $nin: ['', null] },
  }));

  const alreadyEarnedToday = await GoodMorningMessage.findOne({ earnedPoint: true, postedAt: { $gte: start, $lt: end } });
  const earnedPoint = checkedIn && !alreadyEarnedToday;

  const post = await GoodMorningMessage.create({
    user: req.auth.id,
    message,
    earnedPoint,
    isGoodMorning: true,
  });

  if (earnedPoint) {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    await Recognition.findOneAndUpdate(
      { employee: req.auth.id, period },
      { $inc: { points: 1 }, $addToSet: { achievements: 'Best Thought of the Day' } },
      { upsert: true, new: true }
    );
  }

  const populated = await GoodMorningMessage.findById(post._id).populate('user', 'name role avatar');
  res.status(201).json({ post: populated, earnedPoint, checkedIn });
});

// GET /api/recognition?period=YYYY-MM | YYYY  -> performance leaderboard
export const leaderboard = asyncHandler(async (req, res) => {
  const period = req.query.period || new Date().toISOString().slice(0, 7);
  res.json(await computePeriodLeaderboard(period));
});

// GET /api/recognition/periods -> selectable periods
export const recognitionPeriods = asyncHandler(async (_req, res) => {
  res.json(recentPeriods());
});
