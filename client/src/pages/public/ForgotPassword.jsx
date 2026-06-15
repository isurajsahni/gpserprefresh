import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import { Spinner } from '../../components/ui/primitives';
import api from '../../api/client';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMsg(data.message || 'If that email is registered, a reset code has been sent.');
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { email, otp: otp.trim(), newPassword });
      navigate('/login', { state: { notice: data.message || 'Password updated. You can now sign in.' } });
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
          <h1 className="text-xl font-bold text-gray-900">Forgot password</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === 'request'
              ? 'Enter your email and we’ll send you a reset code.'
              : `Enter the 6-digit code sent to ${email} and choose a new password.`}
          </p>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {msg && <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</div>}

          {step === 'request' ? (
            <form onSubmit={requestOtp} className="mt-5 space-y-4">
              <div>
                <label className="label">Email</label>
                <input type="email" required className="input" placeholder="you@gpsfdk.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? <Spinner className="h-5 w-5 text-white" /> : <><Mail size={18} /> Send reset code</>}
              </button>
            </form>
          ) : (
            <form onSubmit={reset} className="mt-5 space-y-4">
              <div>
                <label className="label">Reset code</label>
                <input inputMode="numeric" required className="input tracking-[0.3em]" placeholder="123456" maxLength={6}
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className="label">New password</label>
                <input type="password" required minLength={6} className="input" placeholder="••••••••"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input type="password" required minLength={6} className="input" placeholder="••••••••"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading ? <Spinner className="h-5 w-5 text-white" /> : <><KeyRound size={18} /> Reset password</>}
              </button>
              <button type="button" onClick={() => requestOtp({ preventDefault() {} })} disabled={loading}
                className="w-full text-center text-sm font-medium text-brand-700 hover:underline">
                Resend code
              </button>
            </form>
          )}

          <Link to="/login" className="mt-5 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
