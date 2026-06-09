import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAccess } from '../lib/access';
import { Loading } from './ui/primitives';

// Blocks unauthenticated users.
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Loading your workspace…" />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Redirects logged-in users away from public auth pages.
export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

// Guards a module route against the access matrix.
export function ModuleRoute({ module, children }) {
  const { user } = useAuth();
  if (!hasAccess(module, user?.role)) {
    return (
      <div className="card-pad mx-auto mt-10 max-w-md text-center">
        <h2 className="text-lg font-semibold text-gray-900">Access denied</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your role ({user?.role}) does not have permission to view this module.
        </p>
      </div>
    );
  }
  return children;
}
