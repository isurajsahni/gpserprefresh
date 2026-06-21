import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Leave } from '../models/Leave.js';
import { Tender } from '../models/Tender.js';
import { Lead } from '../models/Lead.js';
import { Campaign } from '../models/Campaign.js';
import { Expense } from '../models/Expense.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { Notice } from '../models/Notice.js';
import { Holiday } from '../models/Holiday.js';
import { GoodMorningMessage } from '../models/GoodMorningMessage.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAccess } from '../config/accessMatrix.js';
import { buildScope } from '../utils/scope.js';
import { computePeriodLeaderboard } from '../utils/leaderboard.js';

const countByStatus = (docs) =>
  docs.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

// GET /api/dashboard/stats — role-aware KPIs, charts, and feeds.
export const dashboardStats = asyncHandler(async (req, res) => {
  let { id, role } = req.auth;
  const now = new Date();

  // Super admins may view another user's dashboard read-only via ?as=<userId>.
  let viewingAs = null;
  if (req.query.as && req.auth.role === 'super_admin' && String(req.query.as) !== String(req.auth.id)) {
    const target = await User.findById(req.query.as).select('name role avatar department');
    if (target) {
      id = String(target._id);
      role = target.role;
      viewingAs = { _id: target._id, name: target.name, role: target.role, avatar: target.avatar, department: target.department };
    }
  }

  // Projects scoped to what the user can see.
  const projAccess = getAccess('projects', role);
  const projScope = buildScope('projects', projAccess, id);
  const projects = await Project.find(projScope);

  // Tasks scoped.
  const taskAccess = getAccess('tasks', role);
  const taskScope = buildScope('tasks', taskAccess, id);
  const tasks = await Task.find(taskScope);

  // My pending leaves / leaves to approve.
  const leaveAccess = getAccess('leaves', role);
  const leaveScope = buildScope('leaves', leaveAccess, id);
  const pendingLeaves = await Leave.countDocuments({ ...leaveScope, status: 'Pending' });

  // KPI cards (each is { label, value, hint }).
  const kpis = [];
  kpis.push({ label: 'My Projects', value: projects.length, icon: 'FolderKanban' });
  kpis.push({
    label: 'Open Tasks',
    value: tasks.filter((t) => t.status !== 'Completed').length,
    icon: 'ListChecks',
  });
  kpis.push({ label: 'Pending Leaves', value: pendingLeaves, icon: 'CalendarDays' });

  if (getAccess('tenders', role)) {
    const activeTenders = await Tender.countDocuments({ status: { $in: ['Published', 'Under Evaluation'] } });
    kpis.push({ label: 'Active Tenders', value: activeTenders, icon: 'FileText' });
  }
  if (getAccess('leads', role)) {
    const openLeads = await Lead.countDocuments({ status: { $nin: ['Converted', 'Lost'] } });
    kpis.push({ label: 'Open Leads', value: openLeads, icon: 'Target' });
  }
  if (getAccess('employees', role)) {
    const headcount = await User.countDocuments({ status: { $ne: 'Inactive' } });
    kpis.push({ label: 'Active Employees', value: headcount, icon: 'Users' });
  }
  if (getAccess('finance', role) === true || getAccess('finance', role) === 'approve') {
    const pendingExpenses = await Expense.countDocuments({ status: 'Pending' });
    kpis.push({ label: 'Expenses to Review', value: pendingExpenses, icon: 'Receipt' });
  }

  // Project status pie.
  const projectStatusChart = Object.entries(countByStatus(projects.map((p) => p.status))).map(
    ([name, value]) => ({ name, value })
  );

  // Task status chart.
  const taskStatusChart = Object.entries(countByStatus(tasks.map((t) => t.status))).map(
    ([name, value]) => ({ name, value })
  );

  // Weekly attendance trend (last 7 days) for the current user.
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const myAttendance = await Attendance.find({ employee: id, date: { $gte: sevenDaysAgo } });
  const attendanceTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const rec = myAttendance.find((a) => new Date(a.date).toDateString() === d.toDateString());
    attendanceTrend.push({
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      hours: rec ? rec.hoursWorked : 0,
    });
  }

  // Recent tasks (mine or visible).
  const recentTasks = await Task.find(taskScope)
    .populate('project', 'name')
    .populate('assignee', 'name')
    .sort('-createdAt')
    .limit(6);

  // Notices, holidays, leaderboard, good-morning feed.
  const notices = await Notice.find().populate('postedBy', 'name').sort('-pinned -postedAt').limit(5);

  const upcomingHolidays = await Holiday.find({ date: { $gte: new Date(now.toDateString()) } })
    .sort('date')
    .limit(5);

  const period = now.toISOString().slice(0, 7);
  const leaderboard = await computePeriodLeaderboard(period, { limit: 5 });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const goodMorningFeed = await GoodMorningMessage.find({ postedAt: { $gte: todayStart } })
    .populate('user', 'name role avatar')
    .sort('postedAt')
    .limit(8);

  res.json({
    kpis,
    charts: { projectStatusChart, taskStatusChart, attendanceTrend },
    recentTasks,
    notices,
    upcomingHolidays,
    leaderboard,
    goodMorningFeed,
    viewingAs,
  });
});
