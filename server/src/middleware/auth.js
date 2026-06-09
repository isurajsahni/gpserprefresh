import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

// Verifies JWT from httpOnly cookie or Authorization header, loads the user.
export async function authenticate(req, _res, next) {
  try {
    let token = null;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.slice(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) throw new ApiError(401, 'Authentication required');

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.status === 'Inactive') throw new ApiError(403, 'Account is deactivated');

    req.user = user;
    req.auth = { id: String(user._id), role: user.role };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
    next(err);
  }
}
