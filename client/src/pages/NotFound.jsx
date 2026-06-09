import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <p className="text-6xl font-extrabold text-brand-700">404</p>
      <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-gray-500">The page you’re looking for doesn’t exist.</p>
      <Link to="/dashboard" className="btn-primary mt-2">Back to dashboard</Link>
    </div>
  );
}
