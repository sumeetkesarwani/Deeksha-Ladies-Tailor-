import { useState, type FormEvent } from 'react';
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from 'firebase/auth';
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react';
import { authPersistenceReady, firebaseAuth } from '../firebase.ts';
import type { AuthUser } from '../types.ts';
import { getAdminLoginEmailCandidates } from '../utils/firebaseSyncHelpers.ts';

interface BusinessLoginModalProps {
  open: boolean;
  standalone?: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser, token: string) => void;
}

function getFriendlyFirebaseAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid Admin mobile/email or password. Please check your Firebase credentials.';
    case 'auth/invalid-email':
      return 'Please enter a valid 10-digit mobile number or Admin email address.';
    case 'auth/too-many-requests':
      return 'Too many failed sign-in attempts. Please wait a moment and try again.';
    case 'auth/user-disabled':
      return 'This Admin account is currently disabled in Firebase.';
    case 'auth/network-request-failed':
      return 'Network error connecting to Firebase Authentication. Check your internet connection.';
    default:
      return 'Could not sign in with Firebase Authentication. Please try again.';
  }
}

export function BusinessLoginModal({ open, standalone = false, onClose, onSuccess }: BusinessLoginModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [idUnlocked, setIdUnlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const candidates = getAdminLoginEmailCandidates(identifier);
    if (candidates.length === 0 || !password) {
      setError('Please enter your 10-digit mobile number or Admin email ID and password.');
      return;
    }

    setLoading(true);
    try {
      await authPersistenceReady;
      await setPersistence(firebaseAuth, browserLocalPersistence).catch(() => undefined);

      let signedInUser: { email: string | null; displayName: string | null; getIdToken: () => Promise<string> } | null = null;
      let signedInEmail = candidates[0];
      let lastErr: unknown = null;

      for (let i = 0; i < candidates.length; i++) {
        const candidateEmail = candidates[i];
        try {
          const credential = await signInWithEmailAndPassword(firebaseAuth, candidateEmail, password);
          signedInUser = credential.user;
          signedInEmail = credential.user.email || candidateEmail;
          break;
        } catch (err: unknown) {
          lastErr = err;
          const code = (err as { code?: string })?.code;
          const canRetryAlternative = code === 'auth/user-not-found' || code === 'auth/invalid-credential';
          if (!canRetryAlternative || i === candidates.length - 1) {
            throw err;
          }
        }
      }

      if (!signedInUser) {
        throw lastErr;
      }

      const idToken = await signedInUser.getIdToken();

      let serverUser: AuthUser = {
        businessId: signedInEmail,
        ownerName: signedInUser.displayName || 'Deeksha Boutique Admin',
      };
      let sessionToken = '';

      try {
        const res = await fetch('/api/auth/firebase-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (res.ok) {
          const data = (await res.json()) as { user?: AuthUser; token?: string };
          if (data.user) serverUser = data.user;
          if (data.token) sessionToken = data.token;
        }
      } catch {
        // Admin portal billing/workshop runs directly against Firebase Auth + RTDB even if backend session bridge fails
      }

      onSuccess(serverUser, sessionToken);
      setIdentifier('');
      setPassword('');
      setIdUnlocked(false);
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      setError(getFriendlyFirebaseAuthError(fbErr?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role={standalone ? undefined : 'dialog'}
      aria-modal={standalone ? undefined : 'true'}
      aria-labelledby="admin-login-title"
      className={
        standalone
          ? 'min-h-screen flex flex-col items-center justify-center bg-[#FAF8F6] px-4 py-8'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4'
      }
    >
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/1794735885525_5eb76f5f.png"
              alt="Deeksha Ladies Tailors & Matching Center logo"
              className="h-12 w-12 object-contain rounded-xl border border-stone-200 bg-[#FAF8F6] shrink-0"
            />
            <h2 id="admin-login-title" className="font-display text-2xl font-semibold text-stone-950">
              Admin Login
            </h2>
          </div>
          {!standalone && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin login modal"
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form autoComplete="off" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="login-admin-identifier" className="block text-xs font-semibold text-stone-700 mb-1">
              Mobile Number or Admin Email ID
            </label>
            <input
              id="login-admin-identifier"
              name="admin_login_identifier_nocache"
              type="text"
              autoComplete="off"
              readOnly={!idUnlocked}
              onPointerDown={() => setIdUnlocked(true)}
              onFocus={() => setIdUnlocked(true)}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none bg-white"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-stone-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="admin_login_password_nocache"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 pr-10 border border-stone-300 focus:border-rose-800 rounded-lg text-sm outline-none bg-white"
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
            {loading ? 'Signing In...' : 'Sign In to Bill Entry Dashboard'}
          </button>
        </form>

        {standalone && (
          <div className="pt-2 border-t border-stone-200 text-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-rose-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go to Public Storefront Website</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
