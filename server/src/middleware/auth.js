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

    // "View as user" (read-only impersonation): a super admin may act with the
    // identity/scope of another user by sending an X-View-As header. ?real=1
    // bypasses it (used to fetch the real account). Writes are blocked elsewhere.
    const viewAsId = req.headers['x-view-as'];
    if (viewAsId && req.query.real !== '1' && user.role === 'super_admin' && String(viewAsId) !== String(user._id)) {
      const target = await User.findById(viewAsId).select('-passwordHash');
      if (target && target.status !== 'Inactive') {
        req.realUser = user;
        req.user = target;
        req.auth = { id: String(target._id), role: target.role };
        req.viewAs = true;
      }
    }
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Invalid or expired token'));
    }
    next(err);
  }
}
