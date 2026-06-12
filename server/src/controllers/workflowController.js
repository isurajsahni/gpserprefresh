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

// A session is considered abandoned only after this long without any heartbeat
// — i.e. the app/tab was genuinely closed. Kept well above the ~20s heartbeat
// interval so cold starts, network blips, and briefly-backgrounded tabs (whose
// timers the browser throttles) don't cause a false auto clock-out.
const STALE_MS = 3 * 60 * 1000; // 3 minutes

// Check-ins up to this time of day (minutes since midnight) are never late.
const LATE_GRACE_UNTIL = 10 * 60; // 10:00 AM

const timeStr = (d) => d.toTimeString().slice(0, 5);

// Minutes elapsed from an "HH:mm" start to a Date (handles crossing midnight).
function minutesFrom(startStr, endDate) {
  const [h, m] = startStr.split(':').map(Number);
  let diff = endDate.getHours() * 60 + endDate.getMinutes() - (h * 60 + m);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

// Finalize an open session that has gone stale (heartbeats stopped → app closed),
// crediting hours up to the last-seen time. Mutates `record`; returns true if changed.
function closeStaleSession(record) {
  if (!record?.clockedIn) return false;
  const lastSeen = record.lastSeen || record.updatedAt || new Date();
  if (Date.now() - new Date(lastSeen).getTime() <= STALE_MS) return false;
  const seen = new Date(lastSeen);
  const startStr = record.sessionStart || record.checkIn;
  const mins = startStr ? minutesFrom(startStr, seen) : 0;
  record.hoursWorked = Math.round((Number(record.hoursWorked || 0) + mins / 60) * 10) / 10;
  record.checkOut = timeStr(seen);
  record.clockedIn = false;
  return true;
}

// Finalize an abandoned open session from a previous day (checked in, never out).
// Credits hours up to lastSeen when known, otherwise closes with no added hours.
function finalizeOrphan(record) {
  const seen = record.lastSeen ? new Date(record.lastSeen) : null;
  const startStr = record.sessionStart || record.checkIn;
  if (seen && startStr) {
    record.hoursWorked = Math.round((Number(record.hoursWorked || 0) + minutesFrom(startStr, seen) / 60) * 10) / 10;
    record.checkOut = timeStr(seen);
  } else {
    record.checkOut = record.checkIn || '';
  }
  record.clockedIn = false;
}

// Background sweep: finalize any sessions that are no longer live, so the list
// never shows people as "on the clock" when they aren't. Called on an interval.
export async function sweepStaleSessions() {
  // 1) Close live sessions whose heartbeat has lapsed (app/tab closed).
  const live = await Attendance.find({ clockedIn: true });
  for (const r of live) {
    if (closeStaleSession(r)) await r.save();
  }
  // 2) Finalize leftover open sessions from previous days (checked in, never out) —
  //    includes old records created before heartbeat tracking existed.
  const { start } = todayRange();
  const orphans = await Attendance.find({
    date: { $lt: start },
    checkIn: { $ne: '' },
    $or: [{ checkOut: '' }, { checkOut: null }, { checkOut: { $exists: false } }],
  });
  for (const r of orphans) {
    finalizeOrphan(r);
    await r.save();
  }
}

// POST /api/attendance/checkin
export const checkIn = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  let record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });

  // If a previous session is still "live" but stale, finalize it first.
  if (record && record.clockedIn) {
    if (closeStaleSession(record)) await record.save();
    if (record.clockedIn) throw new ApiError(409, 'You are already checked in');
  }

  const now = new Date();
  const checkInStr = timeStr(now);
  // Grace period: a check-in any time up to 10:00 AM is never marked late, even
  // if the assigned shift starts earlier. Late only applies after the later of
  // the user's shift start and the 10:00 grace cutoff.
  const me = await User.findById(req.auth.id).select('shiftStart');
  const [shiftH, shiftM] = (me?.shiftStart || '09:30').split(':').map(Number);
  const cutoffMins = Math.max(shiftH * 60 + shiftM, LATE_GRACE_UNTIL);
  const late = now.getHours() * 60 + now.getMinutes() > cutoffMins ? 'Late' : 'Present';

  if (!record) {
    record = await Attendance.create({
      employee: req.auth.id, date: start, checkIn: checkInStr, sessionStart: checkInStr, status: late, clockedIn: true, lastSeen: now,
    });
  } else {
    // New session later in the same day — keep the day's FIRST check-in (display)
    // and accumulated hours/status; only move the session start for hour math.
    if (!record.checkIn) record.checkIn = checkInStr; // legacy safety
    record.sessionStart = checkInStr;
    record.checkOut = '';
    record.clockedIn = true;
    record.lastSeen = now;
    if (record.status === 'Absent') record.status = late;
    await record.save();
  }
  res.status(201).json(record);
});

// POST /api/attendance/checkout  (?auto=1 from the on-close handler — idempotent)
export const checkOut = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });
  const auto = req.query.auto === '1' || req.body?.auto === true;

  if (!record || !record.clockedIn) {
    if (auto) return res.json({ skipped: true }); // page-close may fire when already out
    throw new ApiError(400, 'You are not checked in');
  }

  const now = new Date();
  const startStr = record.sessionStart || record.checkIn; // current session start, not the day's first check-in
  const mins = minutesFrom(startStr, now);
  record.checkOut = timeStr(now);
  record.hoursWorked = Math.round((Number(record.hoursWorked || 0) + mins / 60) * 10) / 10;
  record.clockedIn = false;
  await record.save();
  res.json(record);
});

// POST /api/attendance/heartbeat — keep the live session alive while the app is open.
export const attendanceHeartbeat = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });
  if (!record) return res.json(null);
  // A heartbeat is proof the user is present, so ALWAYS refresh — never close
  // here. (After a server cold start the first heartbeat arrives with an old
  // lastSeen; closing on that would wrongly clock out a present user.) Stale
  // closing is left to the background sweep, which only fires when heartbeats
  // have genuinely stopped.
  if (record.clockedIn) {
    record.lastSeen = new Date();
    await record.save();
  }
  res.json(record);
});

// GET /api/attendance/today — today's record for the current user (finalizes stale sessions).
export const attendanceToday = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({ employee: req.auth.id, date: { $gte: start, $lt: end } });
  if (record && closeStaleSession(record)) await record.save();
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
export const postGoodMorning = asyncHandler(async (req, res) => {
  const message = (req.body.message || '').trim();
  if (message.length < 5) throw new ApiError(400, 'Message is too short');

  const { start, end } = todayRange();
  const alreadyEarnedToday = await GoodMorningMessage.findOne({ earnedPoint: true, postedAt: { $gte: start, $lt: end } });
  const earnedPoint = !alreadyEarnedToday;

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
  res.status(201).json({ post: populated, earnedPoint });
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
