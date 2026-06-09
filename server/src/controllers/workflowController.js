import { Leave } from '../models/Leave.js';
import { Expense } from '../models/Expense.js';
import { Attendance } from '../models/Attendance.js';
import { GoodMorningMessage } from '../models/GoodMorningMessage.js';
import { Recognition } from '../models/Recognition.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canWrite } from '../config/accessMatrix.js';

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

// POST /api/attendance/checkin
export const checkIn = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  let record = await Attendance.findOne({
    employee: req.auth.id,
    date: { $gte: start, $lt: end },
  });
  if (record && record.checkIn) throw new ApiError(409, 'Already checked in today');

  const now = new Date();
  const checkInStr = now.toTimeString().slice(0, 5);
  // Late if check-in is after the user's assigned shift start (default 09:30).
  const me = await User.findById(req.auth.id).select('shiftStart');
  const [shiftH, shiftM] = (me?.shiftStart || '09:30').split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const status = nowMins > shiftH * 60 + shiftM ? 'Late' : 'Present';

  if (!record) {
    record = await Attendance.create({ employee: req.auth.id, date: start, checkIn: checkInStr, status });
  } else {
    record.checkIn = checkInStr;
    record.status = status;
    await record.save();
  }
  res.status(201).json(record);
});

// POST /api/attendance/checkout
export const checkOut = asyncHandler(async (req, res) => {
  const { start, end } = todayRange();
  const record = await Attendance.findOne({
    employee: req.auth.id,
    date: { $gte: start, $lt: end },
  });
  if (!record || !record.checkIn) throw new ApiError(400, 'You have not checked in today');
  if (record.checkOut) throw new ApiError(409, 'Already checked out today');

  const now = new Date();
  record.checkOut = now.toTimeString().slice(0, 5);

  const [inH, inM] = record.checkIn.split(':').map(Number);
  const worked = now.getHours() + now.getMinutes() / 60 - (inH + inM / 60);
  record.hoursWorked = Math.max(0, Math.round(worked * 10) / 10);
  await record.save();
  res.json(record);
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

// GET /api/recognition?period=YYYY-MM | YYYY  -> leaderboard
export const leaderboard = asyncHandler(async (req, res) => {
  const period = req.query.period || new Date().toISOString().slice(0, 7);
  const rows = await Recognition.find({ period })
    .populate('employee', 'name role department avatar')
    .sort('-points');
  res.json(rows.map((r, i) => ({ ...r.toObject(), rank: i + 1 })));
});

// GET /api/recognition/periods -> distinct periods available
export const recognitionPeriods = asyncHandler(async (_req, res) => {
  const periods = await Recognition.distinct('period');
  res.json(periods.sort().reverse());
});
