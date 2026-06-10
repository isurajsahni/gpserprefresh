import { User } from '../models/User.js';
import { ROLES, ROLE_LABELS } from '../config/accessMatrix.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { canWrite } from '../config/accessMatrix.js';
import { generatePassword, generateEmployeeId } from '../utils/credentials.js';
import { sendMail, credentialsEmail } from '../utils/mailer.js';

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
  const {
    name, email, role, password, department, phone, salary, joinDate,
    reportingManager, status, shiftStart, shiftEnd, sendEmail = true,
  } = req.body;
  if (!name || !email || !role) throw new ApiError(400, 'Name, email and role are required');
  if (!ROLES.includes(role)) throw new ApiError(400, 'Invalid role');
  if (await User.findOne({ email: email.toLowerCase() })) throw new ApiError(409, 'Email already registered');

  // Admin may set a demo password; otherwise generate one. It is emailed to the user.
  const tempPassword = password && password.trim() ? password.trim() : generatePassword();
  const employeeId = generateEmployeeId();

  const user = new User({
    name,
    email,
    role,
    employeeId,
    department: department || 'General',
    phone: phone || '',
    salary: salary || 0,
    joinDate: joinDate || Date.now(),
    reportingManager: reportingManager || null,
    status: status || 'Active',
    shiftStart: shiftStart || '09:30',
    shiftEnd: shiftEnd || '18:30',
  });
  await user.setPassword(tempPassword);
  await user.save();

  // Email the login credentials via Resend (falls back to console in dev).
  let emailResult = { sent: false };
  if (sendEmail) {
    // Prefer an explicit public app URL, then the first https origin in CLIENT_URL,
    // and finally the production site — never link the email to localhost.
    const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
    const httpsOrigin = origins.find((o) => o.startsWith('https://'));
    const base = process.env.APP_URL || httpsOrigin || 'https://gpserprefresh-client.vercel.app';
    const loginUrl = `${base.replace(/\/+$/, '')}/login`;
    const { html, text } = credentialsEmail({
      name, email, password: tempPassword, employeeId, role: ROLE_LABELS[role], loginUrl,
    });
    emailResult = await sendMail({ to: email, subject: 'Your GPSFDK ERP account is ready', html, text });
  }

  res.status(201).json({
    employee: clean(user),
    credentials: { employeeId, email, tempPassword },
    email: emailResult,
  });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  if (!canWrite('employees', req.auth.role)) throw new ApiError(403, 'No write permission');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Employee not found');

  const fields = ['name', 'role', 'department', 'phone', 'salary', 'joinDate', 'reportingManager', 'status', 'avatar', 'shiftStart', 'shiftEnd'];
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

// Permanently delete an employee record. Only allowed for already-Inactive
// employees, and never for the requesting user themselves.
export const deleteEmployeePermanent = asyncHandler(async (req, res) => {
  if (!canWrite('employees', req.auth.role)) throw new ApiError(403, 'No write permission');
  if (String(req.params.id) === String(req.auth.id)) throw new ApiError(400, 'You cannot delete your own account');

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Employee not found');
  if (user.status !== 'Inactive') {
    throw new ApiError(400, 'Only inactive employees can be permanently deleted. Deactivate first.');
  }

  await user.deleteOne();
  res.json({ success: true, id: req.params.id });
});

// Lightweight list for dropdowns (assignees, managers) — any authenticated user.
export const userOptions = asyncHandler(async (_req, res) => {
  const users = await User.find({ status: { $ne: 'Inactive' } }).select('name role department').sort('name');
  res.json(users);
});
