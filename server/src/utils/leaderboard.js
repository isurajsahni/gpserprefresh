import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { Attendance } from '../models/Attendance.js';
import { GoodMorningMessage } from '../models/GoodMorningMessage.js';

// Resolve a period string to a [start, end) date range (server timezone = IST).
//   "2026-06" -> that month   |   "2026" -> that year   |   else -> current month
function periodRange(period) {
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
  }
  if (/^\d{4}$/.test(period)) {
    const y = Number(period);
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  const now = new Date();
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

// Performance weights — tune here to rebalance what Employee of the Month rewards.
const W = {
  onTimeTask: 15, // a task completed on or before its due date
  lateTask: 5, //    a task completed, but after its due date
  hour: 0.5, //      per hour worked
  gmFirst: 4, //     being the first to post in the day's Good Morning feed
  gmPost: 1, //      any Good Morning post (engagement)
};

const byId = (rows) => Object.fromEntries(rows.map((r) => [String(r._id), r]));

/**
 * Compute the Employee-of-the-Month leaderboard for a period from real
 * performance: on-time task delivery, hours worked, and Good Morning
 * engagement (with a bonus for posting first). Returns rows shaped like the
 * old Recognition response ({ _id, employee, points, rank }) plus a breakdown.
 */
export async function computePeriodLeaderboard(period, { limit } = {}) {
  const { start, end } = periodRange(period);

  const [users, taskRows, hourRows, gmRows] = await Promise.all([
    User.find({ status: { $ne: 'Inactive' } }).select('name role department avatar').lean(),
    Task.aggregate([
      { $match: { status: 'Completed', assignee: { $ne: null }, updatedAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$assignee',
          completed: { $sum: 1 },
          // On time = no due date, or completed (updatedAt) on/before the due date.
          onTime: {
            $sum: { $cond: [{ $or: [{ $eq: ['$dueDate', null] }, { $gte: ['$dueDate', '$updatedAt'] }] }, 1, 0] },
          },
        },
      },
    ]),
    Attendance.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: '$employee', hours: { $sum: { $ifNull: ['$hoursWorked', 0] } } } },
    ]),
    GoodMorningMessage.aggregate([
      { $match: { postedAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$user', posts: { $sum: 1 }, firsts: { $sum: { $cond: ['$earnedPoint', 1, 0] } } } },
    ]),
  ]);

  const tasks = byId(taskRows);
  const hours = byId(hourRows);
  const gm = byId(gmRows);

  const ranked = users.map((u) => {
    const t = tasks[String(u._id)] || { completed: 0, onTime: 0 };
    const h = hours[String(u._id)] || { hours: 0 };
    const g = gm[String(u._id)] || { posts: 0, firsts: 0 };

    const onTime = t.onTime || 0;
    const late = Math.max(0, (t.completed || 0) - onTime);
    const totalHours = Math.round((h.hours || 0) * 10) / 10;
    const points = Math.round(
      onTime * W.onTimeTask + late * W.lateTask + totalHours * W.hour + (g.firsts || 0) * W.gmFirst + (g.posts || 0) * W.gmPost
    );

    const achievements = [];
    if (onTime > 0) achievements.push('On-time delivery');
    if (totalHours > 0) achievements.push(`${totalHours}h logged`);
    if ((g.firsts || 0) > 0) achievements.push('Early bird');

    return {
      _id: u._id,
      employee: u,
      points,
      breakdown: { tasksCompleted: t.completed || 0, tasksOnTime: onTime, hours: totalHours, gmFirst: g.firsts || 0, gmPosts: g.posts || 0 },
      achievements,
    };
  });

  ranked.sort(
    (a, b) => b.points - a.points || b.breakdown.hours - a.breakdown.hours || a.employee.name.localeCompare(b.employee.name)
  );
  const withRank = ranked.map((r, i) => ({ ...r, rank: i + 1 }));
  return limit ? withRank.slice(0, limit) : withRank;
}

// A handful of recent month periods plus the current year, for period pickers.
export function recentPeriods(count = 12) {
  const now = new Date();
  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...months, String(now.getFullYear())];
}
