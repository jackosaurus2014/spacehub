'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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

export default function LoginPage() {
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
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 glow-border">
          <div className="text-center mb-8">
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus logo"
              width={320}
              height={160}
              className="mx-auto w-full max-w-xs h-auto rounded-lg mb-4"
            />
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Welcome Back
            </h1>
            <p className="text-slate-500 mt-2">
              Sign in to access your SpaceNexus account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div id="login-error" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-slate-600 text-sm mb-2">
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
                  className="block text-slate-600 text-sm"
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
            <p className="text-slate-500">
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
      </div>
    </div>
  );
}
