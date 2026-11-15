import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, X } from 'lucide-react';
import type { AuthUser } from '../types.ts';

interface BusinessLoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
}

export function BusinessLoginModal({ open, onClose, onSuccess }: BusinessLoginModalProps) {
  const [businessId, setBusinessId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!businessId.trim() || !password) {
      setError('Please enter both Business ID and Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: businessId.trim(), password }),
      });
      const data = (await res.json()) as { user?: AuthUser; token?: string; error?: string };
      if (!res.ok || !data.user || !data.token) {
        setError(data.error || 'Invalid Business ID or Password.');
        return;
      }
      onSuccess(data.user, data.token);
      setBusinessId('');
      setPassword('');
    } catch {
      setError('Network error while verifying credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setBusinessId('deeksha_owner');
    setPassword('Deeksha@2026');
    setError('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="business-login-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800">
              <Lock className="w-3.5 h-3.5" />
              <span>Owner Access</span>
            </div>
            <h2 id="business-login-title" className="font-display text-2xl font-semibold text-stone-950">
              Business Login
            </h2>
            <p className="text-xs text-stone-600">
              Sign in to manage tailoring orders, fitting appointments, customer reviews, and shop details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="login-business-id" className="block text-xs font-semibold text-stone-700 mb-1">
              Business ID
            </label>
            <input
              id="login-business-id"
              type="text"
              autoComplete="username"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="e.g. deeksha_owner"
              className="w-full px-3.5 py-2.5 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-stone-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter business password"
                className="w-full px-3.5 py-2.5 pr-10 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-500 hover:text-stone-900"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-700 font-medium">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? 'Signing In...' : 'Sign In to Owner Portal'}
          </button>
        </form>

        <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3 text-xs text-stone-600">
          <div>
            <span className="block font-medium text-stone-800">Starter owner credentials</span>
            <span className="font-mono-tabular text-stone-500">deeksha_owner / Deeksha@2026</span>
          </div>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="px-3 py-1.5 border border-stone-300 hover:border-stone-400 rounded-lg font-semibold text-stone-800 hover:bg-stone-50 whitespace-nowrap"
          >
            Fill Credentials
          </button>
        </div>
      </div>
    </div>
  );
}
