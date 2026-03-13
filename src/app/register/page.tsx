'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LegalDisclaimerModal from '@/components/LegalDisclaimerModal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-green-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-emerald-500' };
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function getRegisterFieldError(field: string, value: string, password?: string): string | null {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'Name is required';
      return null;
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!isValidEmail(value)) return 'Please enter a valid email';
      return null;
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      return null;
    case 'confirmPassword':
      if (!value) return 'Please confirm your password';
      if (password && value !== password) return 'Passwords do not match';
      return null;
    default:
      return null;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const nameError = touched.name ? getRegisterFieldError('name', name) : null;
  const emailError = touched.email ? getRegisterFieldError('email', email) : null;
  const passwordError = touched.password ? getRegisterFieldError('password', password) : null;
  const confirmPasswordError = touched.confirmPassword ? getRegisterFieldError('confirmPassword', confirmPassword, password) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreedToDisclaimer) {
      setError('You must agree to the Legal Disclaimer to create an account');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = extractApiError(data, 'Registration failed');
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success('Account created! Please check your email to verify.');
      router.push('/login?registered=true');
    } catch {
      setError('An error occurred. Please try again.');
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-200px)] flex items-center justify-center py-12 px-4">
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-nebula-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-plasma-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
        {/* Value Proposition Panel */}
        <div className="text-center lg:text-left">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Why SpaceNexus?
          </h2>
          <p className="text-slate-300 mb-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Join thousands of space industry professionals accessing real-time intelligence.
          </p>
          <ul className="space-y-4 text-left">
            <li className="flex items-start gap-3">
              <span className="text-slate-300 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-slate-200 text-sm">30+ integrated modules covering every dimension of the space industry</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-slate-300 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-slate-200 text-sm">Real-time data from 50+ government and industry sources</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-slate-300 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-slate-200 text-sm">Interactive tools: satellite trackers, mission calculators, compliance wizards</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-slate-300 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-slate-200 text-sm">Unified regulatory intelligence: FCC, FAA, ITU, SEC filings in one place</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-slate-300 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-slate-200 text-sm">Free tier with generous access &mdash; no credit card required</span>
            </li>
          </ul>
        </div>

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
              Join SpaceNexus
            </h1>
            <p className="text-slate-400 mt-2">
              Create your account and explore the cosmos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div id="register-error" className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-slate-400 text-sm mb-2">
                Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`input ${nameError ? 'border-red-500' : ''}`}
                placeholder="Your name"
                autoComplete="name"
                aria-invalid={nameError ? true : error ? true : undefined}
                aria-describedby={nameError ? 'name-error' : error ? 'register-error' : undefined}
              />
              {nameError && (
                <p id="name-error" className="text-red-400 text-sm mt-1">{nameError}</p>
              )}
            </div>

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
                aria-invalid={emailError ? true : error ? true : undefined}
                aria-describedby={emailError ? 'email-error' : error ? 'register-error' : undefined}
              />
              {emailError && (
                <p id="email-error" className="text-red-400 text-sm mt-1">{emailError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-slate-400 text-sm mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`input ${passwordError ? 'border-red-500' : ''}`}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                aria-invalid={passwordError ? true : error ? true : undefined}
                aria-describedby={passwordError ? 'password-error' : error ? 'register-error password-strength' : undefined}
              />
              {passwordError && (
                <p id="password-error" className="text-red-400 text-sm mt-1">{passwordError}</p>
              )}
              {password && (
                <div className="mt-2" id="password-strength">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength.score ? passwordStrength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-slate-400 text-sm mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                className={`input ${confirmPasswordError ? 'border-red-500' : ''}`}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
                aria-invalid={confirmPasswordError ? true : error ? true : undefined}
                aria-describedby={confirmPasswordError ? 'confirmPassword-error' : error ? 'register-error' : undefined}
              />
              {confirmPasswordError && (
                <p id="confirmPassword-error" className="text-red-400 text-sm mt-1">{confirmPasswordError}</p>
              )}
            </div>

            <div className="flex items-start gap-3">
              <input
                id="disclaimer"
                type="checkbox"
                checked={agreedToDisclaimer}
                onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-nebula-300 focus:ring-nebula-500 cursor-pointer"
              />
              <label htmlFor="disclaimer" className="text-slate-400 text-sm cursor-pointer">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setDisclaimerOpen(true)}
                  className="text-nebula-300 hover:text-nebula-200 transition-colors underline underline-offset-2"
                >
                  Legal Disclaimer
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToDisclaimer}
              className="btn-primary w-full py-3 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </span>
              ) : (
                'Start Free — No Credit Card'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-nebula-300 hover:text-nebula-200 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Social proof */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Start your space intelligence journey
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-slate-400 text-xs ml-1">4.8/5 rating</span>
            </div>
            <p className="text-slate-500 text-xs mt-2 italic">
              &ldquo;The most comprehensive space industry intelligence platform I&apos;ve used.&rdquo;
            </p>
          </div>
        </div>
      </div>

      <LegalDisclaimerModal
        isOpen={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
      />

      <StickyMobileCTA
        label="Create Free Account"
        href="#name"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
      />
    </div>
  );
}
