import { User } from '../models/User.js';
import { ROLES } from '../config/accessMatrix.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canWrite } from '../config/accessMatrix.js';

const clean = (u) => {
  const o = u.toObject ? u.toObject() : u;
  delete o.passwordHash;
  return o;
};

export const listEmployees = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  const users = await User.find(filter).populate('reportingManager', 'name role').sort('name');
  res.json(users.map(clean));
});

export const getEmployee = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('reportingManager', 'name role');
  if (!user) throw new ApiError(404, 'Employee not found');
  res.json(clean(user));
});

export const createEmployee = asyncHandler(async (req, res) => {
  if (!canWrite('employees', req.auth.role)) throw new ApiError(403, 'No write permission');
  const { name, email, role, password, department, phone, salary, joinDate, reportingManager, status } = req.body;
  if (!name || !email || !role) throw new ApiError(400, 'Name, email and role are required');
  if (!ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');

  const user = new User({
    name,
    email,
    role,
    department: department || 'General',
    phone: phone || '',
    salary: salary || 0,
    joinDate: joinDate || Date.now(),
    reportingManager: reportingManager || null,
    status: status || 'Active',
  });
  await user.setPassword(password || 'gpsfdk123');
  await user.save();
  res.status(201).json(clean(user));
});

export const updateEmployee = asyncHandler(async (req, res) => {
  if (!canWrite('employees', req.auth.role)) throw new ApiError(403, 'No write permission');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Employee not found');

  const fields = ['name', 'role', 'department', 'phone', 'salary', 'joinDate', 'reportingManager', 'status', 'avatar'];
  for (const f of fields) if (req.body[f] !== undefined) user[f] = req.body[f];
  if (req.body.password) await user.setPassword(req.body.password);

  await user.save();
  res.json(clean(user));
});

export const deactivateEmployee = asyncHandler(async (req, res) => {
  if (!canWrite('employees', req.auth.role)) throw new ApiError(403, 'No write permission');
  const user = await User.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { new: true });
  if (!user) throw new ApiError(404, 'Employee not found');
  res.json(clean(user));
});

// Lightweight list for dropdowns (assignees, managers) — any authenticated user.
export const userOptions = asyncHandler(async (_req, res) => {
  const users = await User.find({ status: { $ne: 'Inactive' } }).select('name role department').sort('name');
  res.json(users);
});
