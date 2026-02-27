'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '@/lib/toast';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        toast.error('Invalid email or password');
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div id="login-error" role="alert" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
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
            <p id="email-error" className="text-red-400 text-sm mt-1">{emailError}</p>
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
            <Link href="/forgot-password" className="text-sm text-plasma-400 hover:text-plasma-300 transition-colors">
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
            <p id="password-error" className="text-red-400 text-sm mt-1">{passwordError}</p>
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
            className="text-nebula-300 hover:text-nebula-200 transition-colors"
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
    <div className="relative min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-nebula-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-plasma-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md relative">
        <Suspense fallback={<div className="card p-8 glow-border animate-pulse h-96" />}>
          <LoginContent />
        </Suspense>
      </div>
    </div>
  );
}
