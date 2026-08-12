'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '@/lib/toast';
import { trackGA4Event } from '@/lib/analytics';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function useOAuthProviders() {
  const [oauthProviders, setOauthProviders] = useState({ google: false, microsoft: false });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers-available')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setOauthProviders({ google: !!data.google, microsoft: !!data.microsoft });
        }
      })
      .catch(() => { /* buttons simply stay hidden */ });
    return () => { cancelled = true; };
  }, []);

  return oauthProviders;
}

function OAuthButtons({
  callbackUrl,
  dividerLabel = 'or',
  trackEvent,
}: {
  callbackUrl: string;
  dividerLabel?: string;
  trackEvent?: (provider: string) => void;
}) {
  const oauthProviders = useOAuthProviders();
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  if (!oauthProviders.google && !oauthProviders.microsoft) return null;

  const handleOAuthSignIn = (provider: 'google' | 'azure-ad') => {
    setOauthLoading(provider);
    trackEvent?.(provider);
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="mb-6">
      <div className="space-y-3">
        {oauthProviders.google && (
          <button
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={oauthLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 min-h-[44px] rounded-lg bg-white text-[#3c4043] font-medium text-sm hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
          >
            <GoogleLogo />
            <span>{oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}</span>
          </button>
        )}
        {oauthProviders.microsoft && (
          <button
            type="button"
            onClick={() => handleOAuthSignIn('azure-ad')}
            disabled={oauthLoading !== null}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 min-h-[44px] rounded-lg bg-white text-[#3c4043] font-medium text-sm hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
          >
            <MicrosoftLogo />
            <span>{oauthLoading === 'azure-ad' ? 'Redirecting...' : 'Continue with Microsoft'}</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 mt-6">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-slate-500 text-xs uppercase tracking-wider">{dividerLabel}</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>
    </div>
  );
}

function getFieldError(field: string, value: string): string | null {
  switch (field) {
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!isValidEmail(value)) return 'Please enter a valid email';
      return null;
    case 'password':
      if (!value) return 'Password is required';
      return null;
    default:
      return null;
  }
}

function ResendVerificationBanner() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get('registered') === 'true';
  const isUnverified = searchParams.get('unverified') === 'true';
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  if (!isRegistered && !isUnverified) return null;

  const handleResend = async () => {
    if (!resendEmail.trim() || !isValidEmail(resendEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      if (res.ok) {
        toast.success('If an account exists, a verification email has been sent.');
        setShowResend(false);
        setResendEmail('');
      } else {
        toast.error('Failed to send verification email. Please try again.');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const bgClass = isUnverified ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'bg-green-500/10 border-green-500/50 text-green-400';
  const linkClass = isUnverified ? 'text-yellow-300 hover:text-yellow-200' : 'text-green-300 hover:text-green-200';
  const bannerMessage = isUnverified
    ? 'Your email address has not been verified. Please check your inbox for a verification email.'
    : 'Registration successful! Please check your email to verify your account before signing in.';

  return (
    <div className={`${bgClass} border px-4 py-3 rounded-lg text-sm mb-6`}>
      <p>{bannerMessage}</p>
      {!showResend ? (
        <button
          type="button"
          onClick={() => setShowResend(true)}
          className={`mt-2 ${linkClass} underline text-xs transition-colors`}
        >
          Didn&apos;t receive the verification email? Resend
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="email"
            inputMode="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            placeholder="Enter your email"
            className="input text-sm flex-1"
            autoComplete="email"
            aria-label="Email address for verification resend"
          />
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="btn-primary text-sm py-2 px-4 disabled:opacity-50 whitespace-nowrap"
          >
            {resendLoading ? 'Sending...' : 'Resend'}
          </button>
        </div>
      )}
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const emailError = touched.email ? getFieldError('email', email) : null;
  const passwordError = touched.password ? getFieldError('password', password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    trackGA4Event('login_attempt', { method: 'credentials' });

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        toast.error('Invalid email or password');
        trackGA4Event('login_failure', { method: 'credentials' });
      } else {
        trackGA4Event('login_success', { method: 'credentials' });

        // Detect first login and redirect new users to onboarding
        let isFirstLogin = false;
        try {
          isFirstLogin = localStorage.getItem('spacenexus-first-login') === 'true';
          if (isFirstLogin) {
            localStorage.removeItem('spacenexus-first-login');
          }
        } catch { /* localStorage not available */ }

        if (isFirstLogin) {
          toast.success('Welcome to SpaceNexus! Let\u2019s get you started.');
          router.push('/getting-started');
        } else if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('://')) {
          toast.success('Welcome back!');
          router.push(returnTo);
        } else {
          toast.success('Welcome back!');
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-8 glow-border">
      <div className="text-center mb-8">
        <Image
          src="/spacenexus-logo.png"
          alt="SpaceNexus logo"
          width={320}
          height={160}
          className="mx-auto w-full max-w-xs h-auto rounded-lg mb-4"
        />
        <h1 className="text-2xl font-display font-bold text-white">
          Welcome Back
        </h1>
        <p className="text-slate-400 mt-2">
          Sign in to access your SpaceNexus account
        </p>
      </div>

      <ResendVerificationBanner />

      <OAuthButtons
        callbackUrl={
          returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('://')
            ? returnTo
            : '/dashboard'
        }
        trackEvent={(provider) => trackGA4Event('login_attempt', { method: provider })}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div id="login-error" role="alert" aria-live="polite" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-slate-400 text-sm mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => handleBlur('email')}
            className={`input ${emailError ? 'border-red-500' : ''}`}
            placeholder="you@example.com"
            required
            autoComplete="email"
            aria-required="true"
            aria-invalid={emailError ? true : error ? true : undefined}
            aria-describedby={emailError ? 'email-error' : error ? 'login-error' : undefined}
          />
          {emailError && (
            <p id="email-error" aria-live="polite" className="text-red-400 text-sm mt-1">{emailError}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-slate-400 text-sm"
            >
              Password
            </label>
            <Link href="/forgot-password" className="text-sm text-white/70 hover:text-white transition-colors py-1 px-2 -mr-2 rounded">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => handleBlur('password')}
            className={`input ${passwordError ? 'border-red-500' : ''}`}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            aria-required="true"
            aria-invalid={passwordError ? true : error ? true : undefined}
            aria-describedby={passwordError ? 'password-error' : error ? 'login-error' : undefined}
          />
          {passwordError && (
            <p id="password-error" aria-live="polite" className="text-red-400 text-sm mt-1">{passwordError}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Signing in...</span>
            </span>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-white/90 hover:text-white transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-[calc(100dvh-200px)] flex items-center justify-center py-12 px-4">
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Suspense fallback={<div className="card p-8 glow-border animate-pulse h-96" />}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
