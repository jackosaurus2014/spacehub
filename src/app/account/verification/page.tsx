'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import VerifiedBadge from '@/components/VerifiedBadge';

type RequestableBadge = 'founder' | 'investor' | 'media';

interface VerificationState {
  verifiedBadge: string;
  verificationRequested: boolean;
  verificationNote: string | null;
  emailVerified: boolean;
}

const BADGE_OPTIONS: { value: RequestableBadge; label: string; description: string }[] = [
  {
    value: 'founder',
    label: 'Founder',
    description: 'Founder or co-founder of a space-industry company.',
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Active investor, VC, angel, or corp-dev in the space sector.',
  },
  {
    value: 'media',
    label: 'Media / Press',
    description: 'Journalist, analyst, or media outlet covering the space industry.',
  },
];

export default function VerificationRequestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [state, setState] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [badge, setBadge] = useState<RequestableBadge>('founder');
  const [justification, setJustification] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [supportingUrl, setSupportingUrl] = useState('');

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/account/verification');
      if (res.ok) {
        const json = await res.json();
        setState(json.data);
      }
    } catch {
      toast.error('Failed to load verification state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchState();
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, fetchState, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = justification.trim();
    if (trimmed.length < 50) {
      toast.error('Justification must be at least 50 characters');
      return;
    }
    if (trimmed.length > 1000) {
      toast.error('Justification must be 1000 characters or less');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/account/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          badge,
          justification: trimmed,
          website: website.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
          supportingUrl: supportingUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(extractApiError(data, 'Failed to submit request'));
        return;
      }

      toast.success('Verification request submitted. We will review it shortly.');
      await fetchState();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!session) return null;

  const alreadyPending = state?.verificationRequested ?? false;
  const currentBadge = state?.verifiedBadge ?? 'unverified';

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-400 mb-4">
          <Link href="/account" className="hover:text-white transition-colors">
            Account
          </Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-white/70">Verification</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">Request Verification</h1>
        <p className="text-slate-400 mb-8">
          Apply for a founder, investor, or media badge. Our team reviews every
          request manually.
        </p>

        {/* Current status */}
        <section className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Your current badge</h2>
          <div className="flex items-center gap-2">
            {currentBadge === 'unverified' ? (
              <span className="text-slate-400 text-sm">No badge yet</span>
            ) : (
              <>
                <VerifiedBadge badge={currentBadge} size="lg" />
                <span className="text-sm text-white/90 capitalize">{currentBadge}</span>
              </>
            )}
          </div>
          {!state?.emailVerified && (
            <p className="text-xs text-amber-400 mt-3">
              Your email is not yet verified. Verify your email to automatically
              receive the &quot;Email verified&quot; badge.
            </p>
          )}
        </section>

        {alreadyPending ? (
          <section className="bg-amber-950/20 border border-amber-900/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-amber-300 mb-2">
              Request pending
            </h2>
            <p className="text-sm text-slate-300">
              Your verification request is in the queue. You&apos;ll be notified
              when an admin reviews it. You cannot submit another request while
              this one is pending.
            </p>
          </section>
        ) : (
          <section className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6">Submit a request</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Badge select */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Which badge are you applying for?
                </label>
                <div className="space-y-2">
                  {BADGE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        badge === opt.value
                          ? 'border-white/20 bg-white/[0.06]'
                          : 'border-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <input
                        type="radio"
                        name="badge"
                        value={opt.value}
                        checked={badge === opt.value}
                        onChange={() => setBadge(opt.value)}
                        className="mt-1 accent-white"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <VerifiedBadge badge={opt.value} size="md" />
                          <span className="text-sm font-medium text-white">{opt.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Justification */}
              <div>
                <label htmlFor="justification" className="block text-sm text-slate-300 mb-1.5">
                  Justification <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={5}
                  required
                  minLength={50}
                  maxLength={1000}
                  placeholder="Tell us about your role, your company/outlet, and why you qualify for this badge. Be specific — a strong justification speeds up approval."
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-slate-500">50–1000 characters</p>
                  <p className={`text-xs ${
                    justification.length < 50 ? 'text-slate-500' : justification.length > 1000 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {justification.length} / 1000
                  </p>
                </div>
              </div>

              {/* Website */}
              <div>
                <label htmlFor="website" className="block text-sm text-slate-300 mb-1.5">
                  Company / Fund / Outlet Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label htmlFor="linkedin" className="block text-sm text-slate-300 mb-1.5">
                  LinkedIn Profile
                </label>
                <input
                  id="linkedin"
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/your-profile"
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                />
              </div>

              {/* Supporting link */}
              <div>
                <label htmlFor="supporting" className="block text-sm text-slate-300 mb-1.5">
                  Supporting Link{' '}
                  <span className="text-slate-500 font-normal">
                    (press mention, crunchbase, portfolio article, etc.)
                  </span>
                </label>
                <input
                  id="supporting"
                  type="url"
                  value={supportingUrl}
                  onChange={(e) => setSupportingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.06] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || justification.trim().length < 50}
                  className="px-6 py-2 bg-white hover:bg-slate-100 disabled:bg-white/[0.08] disabled:text-slate-500 text-slate-900 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Automatic badges info */}
        <section className="mt-6 bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-2">
            Automatic badges
          </h3>
          <ul className="text-xs text-slate-400 space-y-1">
            <li className="flex items-center gap-2">
              <VerifiedBadge badge="email" size="sm" /> Granted automatically when you verify your email.
            </li>
            <li className="flex items-center gap-2">
              <VerifiedBadge badge="domain" size="sm" /> Granted automatically when you claim a company profile using an email that matches the company&apos;s domain.
            </li>
            <li className="flex items-center gap-2">
              <VerifiedBadge badge="admin" size="sm" /> Reserved for SpaceNexus staff.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
