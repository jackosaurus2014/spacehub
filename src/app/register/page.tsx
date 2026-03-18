'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LegalDisclaimerModal from '@/components/LegalDisclaimerModal';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';
import { trackGA4Event } from '@/lib/analytics';

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

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse monetization-relevant query params
  const isFounding = searchParams.get('founding') === 'true';
  const isTrial = searchParams.get('trial') === 'true';
  const planParam = searchParams.get('plan'); // 'pro' | 'enterprise'

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [role, setRole] = useState('');
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
    trackGA4Event('signup_attempt', {
      role: role || 'not_selected',
      plan: planParam || 'free',
      founding: isFounding,
      trial: isTrial,
    });

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
        body: JSON.stringify({ name, email, password, role: role || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = extractApiError(data, 'Registration failed');
        setError(msg);
        toast.error(msg);
        return;
      }

      // Store selected role for future personalization
      if (role) {
        try { localStorage.setItem('spacenexus-user-role', role); } catch { /* ignore */ }
      }
      // Flag first login so the login page can redirect to /getting-started
      try { localStorage.setItem('spacenexus-first-login', 'true'); } catch { /* ignore */ }
      toast.success('Account created! Please check your email to verify.');
      // Preserve plan context so the user can subscribe after login
      const loginParams = new URLSearchParams({ registered: 'true' });
      if (isFounding) {
        loginParams.set('founding', 'true');
        loginParams.set('plan', planParam || 'pro');
      } else if (isTrial) {
        loginParams.set('trial', 'true');
        loginParams.set('plan', planParam || 'pro');
      }
      router.push(`/login?${loginParams.toString()}`);
    } catch {
      setError('An error occurred. Please try again.');
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-200px)] flex items-center justify-center py-12 px-4">
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-white/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative">
        {/* Value Proposition Panel */}
        <div className="text-center lg:text-left">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Why SpaceNexus?
          </h2>
          <p className="text-white/80 mb-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Join thousands of space industry professionals accessing real-time intelligence.
          </p>
          <ul className="space-y-4 text-left">
            <li className="flex items-start gap-3">
              <span className="text-white/80 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-white/90 text-sm">30+ integrated modules covering every dimension of the space industry</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white/80 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-white/90 text-sm">Real-time data from 50+ government and industry sources</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white/80 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-white/90 text-sm">Interactive tools: satellite trackers, mission calculators, compliance wizards</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white/80 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-white/90 text-sm">Unified regulatory intelligence: FCC, FAA, ITU, SEC filings in one place</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-white/80 mt-0.5 flex-shrink-0">&#10003;</span>
              <span className="text-white/90 text-sm">Free tier with generous access &mdash; no credit card required</span>
            </li>
          </ul>
        </div>

        <div className="card p-8 glow-border">
          {/* Founding Member banner */}
          {isFounding && (
            <div className="mb-6 p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-indigo-900/60 via-purple-800/60 to-blue-900/60">
              <p className="text-sm font-bold text-white mb-1">
                You&apos;re claiming a Founding Member spot!
              </p>
              <p className="text-purple-200 text-sm">
                <span className="font-bold text-white">$4.99/month</span> locked for life.
                Create your account below to secure your price.
              </p>
            </div>
          )}

          {/* Trial banner */}
          {isTrial && !isFounding && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <p className="text-sm font-bold text-white mb-1">
                Start your free 14-day Professional trial
              </p>
              <p className="text-amber-200 text-sm">
                Full access to all Professional features. No credit card required.
              </p>
            </div>
          )}

          <div className="text-center mb-8">
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus logo"
              width={320}
              height={160}
              className="mx-auto w-full max-w-xs h-auto rounded-lg mb-4"
            />
            <h1 className="text-2xl font-display font-bold text-white">
              {isFounding
                ? 'Claim Your Founding Member Spot'
                : isTrial
                ? 'Start Your Free Trial'
                : 'Join SpaceNexus'}
            </h1>
            <p className="text-slate-400 mt-2">
              {isFounding
                ? 'Lock in $4.99/month Professional access forever'
                : isTrial
                ? 'Create your account to begin your 14-day Professional trial'
                : 'Create your account and explore the cosmos'}
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
                          level <= passwordStrength.score ? passwordStrength.color : 'bg-white/[0.08]'
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

            <div>
              <label className="block text-slate-400 text-sm mb-2">
                What brings you to SpaceNexus?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Space Industry Investor',
                  'Aerospace Engineer',
                  'Policy & Regulatory Analyst',
                  'Space Startup Founder',
                  'Defense & Intelligence',
                  'Space Enthusiast',
                  'Other',
                ].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-sm ${
                      role === option
                        ? 'border-white/20 bg-white/[0.08] text-white'
                        : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/10 hover:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option}
                      checked={role === option}
                      onChange={(e) => {
                        setRole(e.target.value);
                        trackGA4Event('role_selected', { role: e.target.value });
                      }}
                      className="sr-only"
                    />
                    <span className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      role === option
                        ? 'border-white bg-white'
                        : 'border-white/20'
                    }`}>
                      {role === option && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      )}
                    </span>
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="disclaimer"
                type="checkbox"
                checked={agreedToDisclaimer}
                onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/[0.1] bg-white/[0.04] text-white/90 focus:ring-white/20 cursor-pointer"
              />
              <label htmlFor="disclaimer" className="text-slate-400 text-sm cursor-pointer">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setDisclaimerOpen(true)}
                  className="text-white/90 hover:text-white transition-colors underline underline-offset-2"
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
              ) : isFounding ? (
                'Create Account & Claim Founding Price'
              ) : isTrial ? (
                'Create Account & Start Free Trial'
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
                className="text-white/90 hover:text-white transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Recommended Plans — set expectations + upsell */}
          {!isFounding && !isTrial && (
            <div className="mt-6 p-4 rounded-xl border border-white/[0.08] bg-white/[0.03]">
              <p className="text-sm font-semibold text-white mb-3">Included with your free account:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  10 news articles per day
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  50 satellite tracking
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Mission Control countdown
                </li>
              </ul>
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-slate-400">
                  Want more?{' '}
                  <Link href="/pricing" className="text-white/90 hover:text-white transition-colors font-medium underline underline-offset-2">
                    Upgrade to Professional for $19.99/month
                  </Link>
                </p>
              </div>
            </div>
          )}

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
        label={isFounding ? 'Claim Founding Spot' : isTrial ? 'Start Free Trial' : 'Create Free Account'}
        href="#name"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Loading...</div></div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
