import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui/primitives';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const notice = location.state?.notice;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link to="/"><Logo /></Link>
        </div>
        <div className="card-pad">
          <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your GPSFDK ERP workspace.</p>

          {notice && !error && <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}
          {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                required
                className="input"
                placeholder="you@gpsfdk.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline">Forgot password?</Link>
              </div>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Spinner className="h-5 w-5 text-white" /> : <><LogIn size={18} /> Sign in</>}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
