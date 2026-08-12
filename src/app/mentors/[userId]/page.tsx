'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import VerifiedBadge from '@/components/VerifiedBadge';
import { toast } from '@/lib/toast';
import { clientLogger } from '@/lib/client-logger';

interface MentorDetail {
  profile: {
    id: string;
    userId: string;
    headline: string;
    bio: string;
    expertiseAreas: string[];
    yearsExperience: number | null;
    hourlyRate: number | null;
    currency: string | null;
    availability: string | null;
    remoteOnly: boolean;
    acceptingMentees: boolean;
    pastCompanies: string[];
    linkedinUrl: string | null;
    endorsementCount: number;
    rating: number | null;
    ratingCount: number;
  };
  user: {
    id: string;
    name: string | null;
    verifiedBadge?: string | null;
    reputation?: number | null;
  } | null;
  endorsementCount: number;
  skillSummary: { skill: string; count: number }[];
}

export default function MentorDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const { data: session } = useSession();

  const [detail, setDetail] = useState<MentorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [requested, setRequested] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mentors/${userId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error('Failed to load mentor');
      setDetail(body.data);
    } catch (err) {
      clientLogger.error('Failed to fetch mentor detail', {
        error: err instanceof Error ? err.message : String(err),
      });
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRequest = async () => {
    if (!session?.user) {
      toast.info('Please sign in to request mentorship.');
      return;
    }
    if (message.trim().length < 10) {
      toast.error('Please write a short intro message (at least 10 characters).');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/mentors/${userId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error?.message || body.error || 'Failed to send request.');
        return;
      }
      setRequested(true);
      toast.success('Mentorship request sent!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (notFound || !detail) {
    return (
      <div className="min-h-screen container mx-auto px-4 py-16">
        <EmptyState
          icon="🧑‍🚀"
          title="Mentor not found"
          description="This mentor profile doesn't exist or has been removed."
          action={
            <Link href="/mentors" className="btn-primary px-6 py-2 text-sm">
              Browse Mentors
            </Link>
          }
        />
      </div>
    );
  }

  const { profile, user, skillSummary } = detail;
  const rate =
    profile.hourlyRate === null
      ? 'Rate on request'
      : `${(profile.currency || 'USD') === 'USD' ? '$' : `${profile.currency} `}${profile.hourlyRate.toFixed(0)}/hr`;

  return (
    <div className="min-h-screen bg-space-900 pb-16">
      <div className="container mx-auto px-4 max-w-4xl pt-8">
        <Link href="/mentors" className="text-sm text-slate-400 hover:text-white transition-colors">
          &larr; All mentors
        </Link>

        {/* Header card */}
        <div className="card p-6 mt-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/5 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl font-bold text-white/90 flex-shrink-0">
              {(user?.name || '?')
                .split(' ')
                .map((w) => w.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {user?.name || 'Anonymous Mentor'}
                <VerifiedBadge badge={user?.verifiedBadge} size="md" />
              </h1>
              <p className="text-slate-300 mt-1">{profile.headline}</p>
              <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-400">
                {profile.yearsExperience !== null && <span>{profile.yearsExperience} years experience</span>}
                {profile.remoteOnly && <span className="text-emerald-400">Remote</span>}
                {profile.availability && <span>{profile.availability}</span>}
                <span className="text-white/80 font-medium">{rate}</span>
              </div>
            </div>
            {profile.linkedinUrl && (
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm py-2 px-4 shrink-0"
              >
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">About</h2>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{profile.bio}</p>
          {profile.pastCompanies.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Past companies</h3>
              <div className="flex flex-wrap gap-2">
                {profile.pastCompanies.map((c) => (
                  <span key={c} className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded text-white/80">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expertise + endorsements */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">
            Expertise
            <span className="text-slate-500 text-sm font-normal ml-2">
              {detail.endorsementCount} endorsement{detail.endorsementCount !== 1 ? 's' : ''}
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.expertiseAreas.map((tag) => {
              const endorsed = skillSummary.find((s) => s.skill === tag);
              return (
                <span
                  key={tag}
                  className="text-sm px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-white/85"
                >
                  {tag}
                  {endorsed && <span className="text-amber-400 ml-1.5">★ {endorsed.count}</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* Request mentorship */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Request mentorship</h2>
          {!profile.acceptingMentees ? (
            <p className="text-slate-400 text-sm">This mentor is not currently accepting new mentees.</p>
          ) : requested ? (
            <p className="text-emerald-400 text-sm">
              Request sent! You&apos;ll get a notification when {user?.name || 'the mentor'} responds.
            </p>
          ) : (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Introduce yourself: your background, what you're working toward, and what you'd like help with..."
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-white/20 mb-3"
              />
              <button
                onClick={handleRequest}
                disabled={sending}
                className={`btn-primary px-6 py-2.5 text-sm ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {sending ? 'Sending...' : session?.user ? 'Send Request' : 'Sign in to Request'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
