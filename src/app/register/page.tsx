'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import LegalDisclaimerModal from '@/components/LegalDisclaimerModal';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
        setError(data.error || 'Registration failed');
        return;
      }

      router.push('/login?registered=true');
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
              alt="SpaceNexus"
              width={320}
              height={160}
              className="mx-auto w-full max-w-xs h-auto rounded-lg mb-4"
            />
            <h1 className="text-2xl font-display font-bold text-slate-900">
              Join SpaceNexus
            </h1>
            <p className="text-slate-500 mt-2">
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
              <label htmlFor="name" className="block text-slate-600 text-sm mb-2">
                Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Your name"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'register-error' : undefined}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-slate-600 text-sm mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'register-error' : undefined}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-slate-600 text-sm mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 6 characters"
                required
                minLength={6}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'register-error' : undefined}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-slate-600 text-sm mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm your password"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'register-error' : undefined}
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                id="disclaimer"
                type="checkbox"
                checked={agreedToDisclaimer}
                onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-200 bg-slate-50 text-nebula-500 focus:ring-nebula-500 cursor-pointer"
              />
              <label htmlFor="disclaimer" className="text-slate-500 text-sm cursor-pointer">
                I have read and agree to the{' '}
                <button
                  type="button"
                  onClick={() => setDisclaimerOpen(true)}
                  className="text-nebula-400 hover:text-nebula-300 transition-colors underline underline-offset-2"
                >
                  Legal Disclaimer
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agreedToDisclaimer}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating account...</span>
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-nebula-300 hover:text-nebula-200 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      <LegalDisclaimerModal
        isOpen={disclaimerOpen}
        onClose={() => setDisclaimerOpen(false)}
      />
    </div>
  );
}
