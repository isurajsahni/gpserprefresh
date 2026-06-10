import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireModule, requireRole } from '../middleware/authorize.js';
import { crudRouter } from './crudRouter.js';

import authRoutes from './auth.js';

// Models
import { Tender } from '../models/Tender.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { Leave } from '../models/Leave.js';
import { Attendance } from '../models/Attendance.js';
import { Expense } from '../models/Expense.js';
import { Campaign } from '../models/Campaign.js';
import { Lead } from '../models/Lead.js';
import { Asset } from '../models/Asset.js';
import { DesignAsset } from '../models/DesignAsset.js';
import { Payroll } from '../models/Payroll.js';
import { Notice } from '../models/Notice.js';
import { Holiday } from '../models/Holiday.js';

// Controllers
import {
  setLeaveStatus,
  setExpenseStatus,
  checkIn,
  checkOut,
  listGoodMorning,
  postGoodMorning,
  leaderboard,
  recognitionPeriods,
} from '../controllers/workflowController.js';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  deleteEmployeePermanent,
  userOptions,
} from '../controllers/employeeController.js';
import {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
  createNotification,
} from '../controllers/notificationController.js';
import { dashboardStats } from '../controllers/dashboardController.js';
import { reportsOverview, attendanceReport } from '../controllers/reportsController.js';

const api = Router();

// ---- Public auth ----
api.use('/auth', authRoutes);

// Everything below requires a valid token.
api.use(authenticate);

// ---- Access matrix (exposed to client for UI gating) ----
api.get('/access-matrix', async (_req, res) => {
  const { ACCESS_MATRIX, ROLE_LABELS } = await import('../config/accessMatrix.js');
  res.json({ matrix: ACCESS_MATRIX, labels: ROLE_LABELS });
});

// ---- Dashboard & reports ----
api.get('/dashboard/stats', dashboardStats);
api.get('/reports/overview', requireModule('reports'), reportsOverview);
api.get('/reports/attendance', requireModule('reports'), attendanceReport);

// ---- User options (dropdowns) ----
api.get('/users/options', userOptions);

// ---- Employees (custom controller) ----
{
  const r = Router();
  const guard = requireModule('employees');
  r.get('/', guard, listEmployees);
  r.get('/:id', guard, getEmployee);
  r.post('/', guard, createEmployee);
  r.put('/:id', guard, updateEmployee);
  r.delete('/:id/permanent', guard, deleteEmployeePermanent); // hard delete (inactive only)
  r.delete('/:id', guard, deactivateEmployee); // soft delete (set Inactive)
  api.use('/employees', r);
}

// ---- Attendance (+ check in/out) ----
{
  const { router } = crudRouter(Attendance, {
    module: 'attendance',
    ownerField: 'employee',
    populate: [{ path: 'employee', select: 'name role department' }],
    sort: '-date',
  });
  router.post('/checkin', requireModule('attendance'), checkIn);
  router.post('/checkout', requireModule('attendance'), checkOut);
  api.use('/attendance', router);
}

// ---- Leaves (+ approve/reject) ----
{
  const { router } = crudRouter(Leave, {
    module: 'leaves',
    ownerField: 'employee',
    populate: [{ path: 'employee', select: 'name role department' }],
    sort: '-appliedOn',
  });
  router.patch('/:id/status', requireModule('leaves'), setLeaveStatus);
  api.use('/leaves', router);
}

// ---- Finance / Expenses (+ approve/reject) ----
{
  const { router } = crudRouter(Expense, {
    module: 'finance',
    ownerField: 'employee',
    populate: [{ path: 'employee', select: 'name role department' }],
    sort: '-date',
  });
  router.patch('/:id/status', requireModule('finance'), setExpenseStatus);
  api.use('/expenses', router);
}

// ---- Tenders ----
api.use('/tenders', crudRouter(Tender, { module: 'tenders', sort: '-deadline' }).router);

// ---- Projects ----
api.use(
  '/projects',
  crudRouter(Project, {
    module: 'projects',
    populate: [
      { path: 'assignees', select: 'name role avatar' },
      { path: 'manager', select: 'name role' },
    ],
  }).router
);

// ---- Tasks ----
api.use(
  '/tasks',
  crudRouter(Task, {
    module: 'tasks',
    ownerField: 'assignee',
    populate: [
      { path: 'project', select: 'name' },
      { path: 'assignee', select: 'name role avatar' },
    ],
    sort: '-createdAt',
  }).router
);

// ---- Payroll ----
api.use(
  '/payroll',
  crudRouter(Payroll, {
    module: 'payroll',
    ownerField: 'employee',
    populate: [{ path: 'employee', select: 'name role department' }],
    sort: '-month',
  }).router
);

// ---- Campaigns ----
api.use(
  '/campaigns',
  crudRouter(Campaign, {
    module: 'campaigns',
    ownerField: 'assignedTo',
    populate: [{ path: 'assignedTo', select: 'name role' }],
  }).router
);

// ---- Leads ----
api.use(
  '/leads',
  crudRouter(Lead, {
    module: 'leads',
    ownerField: 'assignedTo',
    populate: [{ path: 'assignedTo', select: 'name role' }],
    sort: '-lastContact',
  }).router
);

// ---- Assets ----
api.use(
  '/assets',
  crudRouter(Asset, {
    module: 'assets',
    populate: [{ path: 'assignedTo', select: 'name role department' }],
    sort: 'name',
  }).router
);

// ---- Design Library ----
api.use(
  '/design-assets',
  crudRouter(DesignAsset, {
    module: 'design_library',
    populate: [{ path: 'uploadedBy', select: 'name role' }],
    sort: '-uploadedOn',
  }).router
);

// ---- Notifications ----
{
  const r = Router();
  r.get('/', listNotifications);
  r.get('/unread-count', unreadCount);
  r.patch('/read-all', markAllRead);
  r.patch('/:id/read', markRead);
  r.post('/', createNotification);
  api.use('/notifications', r);
}

// ---- Notices (read: all; write: super_admin) ----
{
  const r = Router();
  r.get('/', async (_req, res, next) => {
    try {
      const notices = await Notice.find().populate('postedBy', 'name role').sort('-pinned -postedAt');
      res.json(notices);
    } catch (e) {
      next(e);
    }
  });
  r.post('/', requireRole('super_admin', 'operation'), async (req, res, next) => {
    try {
      const notice = await Notice.create({ ...req.body, postedBy: req.auth.id });
      res.status(201).json(await notice.populate('postedBy', 'name role'));
    } catch (e) {
      next(e);
    }
  });
  r.delete('/:id', requireRole('super_admin'), async (req, res, next) => {
    try {
      await Notice.findByIdAndDelete(req.params.id);
      res.json({ success: true, id: req.params.id });
    } catch (e) {
      next(e);
    }
  });
  api.use('/notices', r);
}

// ---- Holidays (read: all; write: super_admin) ----
{
  const r = Router();
  r.get('/', async (_req, res, next) => {
    try {
      res.json(await Holiday.find().sort('date'));
    } catch (e) {
      next(e);
    }
  });
  r.post('/', requireRole('super_admin'), async (req, res, next) => {
    try {
      res.status(201).json(await Holiday.create(req.body));
    } catch (e) {
      next(e);
    }
  });
  api.use('/holidays', r);
}

// ---- Recognition / Leaderboards ----
api.get('/recognition', leaderboard);
api.get('/recognition/periods', recognitionPeriods);

// ---- Good Morning feed ----
api.get('/good-morning', listGoodMorning);
api.post('/good-morning', postGoodMorning);

export default api;
