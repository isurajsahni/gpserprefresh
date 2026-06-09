import { z } from 'zod';
import { User } from '../models/User.js';
import { ROLES } from '../config/accessMatrix.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken, cookieOptions } from '../utils/token.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(ROLES),
  password: z.string().min(6),
  department: z.string().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new ApiError(409, 'Email already registered');

  const user = new User({
    name: data.name,
    email: data.email,
    role: data.role,
    department: data.department || 'General',
    phone: data.phone || '',
  });
  await user.setPassword(data.password);
  await user.save();

  const token = signToken(user);
  res.cookie('token', token, cookieOptions);
  res.status(201).json({ token, user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (user.status === 'Inactive') throw new ApiError(403, 'Account is deactivated');

  const ok = await user.comparePassword(data.password);
  if (!ok) throw new ApiError(401, 'Invalid email or password');

  const token = signToken(user);
  res.cookie('token', token, cookieOptions);
  res.json({ token, user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.id).populate('reportingManager', 'name role');
  res.json({ user: publicUser(user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.id).select('+passwordHash');
  const { name, phone, department, avatar, currentPassword, newPassword } = req.body;

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (department !== undefined) user.department = department;
  if (avatar !== undefined) user.avatar = avatar;

  if (newPassword) {
    if (!currentPassword) throw new ApiError(400, 'Current password is required');
    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw new ApiError(401, 'Current password is incorrect');
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');
    await user.setPassword(newPassword);
  }

  await user.save();
  res.json({ user: publicUser(user) });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('token', cookieOptions);
  res.json({ success: true });
});
