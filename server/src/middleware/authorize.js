import { getAccess, canWrite } from '../config/accessMatrix.js';
import { ApiError } from '../utils/ApiError.js';

// Require any access to a module (read or write). Attaches req.access = the matrix value.
export function requireModule(module) {
  return (req, _res, next) => {
    const access = getAccess(module, req.auth.role);
    if (access === false) {
      return next(new ApiError(403, `You do not have access to ${module}`));
    }
    req.access = access;
    next();
  };
}

// Require write capability (blocks 'view'-only roles on mutating routes).
export function requireWrite(module) {
  return (req, _res, next) => {
    if (!canWrite(module, req.auth.role)) {
      return next(new ApiError(403, `You do not have permission to modify ${module}`));
    }
    req.access = getAccess(module, req.auth.role);
    next();
  };
}

// Restrict a route to specific roles (e.g. settings -> super_admin only).
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.auth.role)) {
      return next(new ApiError(403, 'Insufficient role'));
    }
    next();
  };
}
