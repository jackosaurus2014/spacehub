'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { clientLogger } from '@/lib/client-logger';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal from '@/components/ui/ScrollReveal';

interface SpeakingOpportunity {
  id: string;
  title: string;
  organization: string;
  conferenceName: string | null;
  topic: string;
  description: string;
  eventDate: string;
  submissionDeadline: string | null;
  location: string | null;
  isRemote: boolean;
  compensation: string | null;
  audienceSize: number | null;
  cfpUrl: string | null;
  contactEmail: string | null;
  contactName: string | null;
  tags: string[];
  status: string;
  featured: boolean;
  submittedById: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function SpeakingOpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const [op, setOp] = useState<SpeakingOpportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/speaking/${params.id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || 'Not found');
      }
      setOp(json.data.opportunity);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      setError(msg);
      clientLogger.error('Failed to load speaking opportunity', { error: msg });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const isLoggedIn = Boolean(session?.user?.id);
  const isAdmin = Boolean(session?.user?.isAdmin);
  const isOwner = Boolean(op && session?.user?.id && op.submittedById === session.user.id);
  const canDelete = op
    ? isAdmin || (isOwner && op.status === 'pending')
    : false;

  const handleDelete = async () => {
    if (!op) return;
    if (!confirm('Delete this speaking opportunity? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/speaking/${op.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/speaking');
    } catch (err) {
      clientLogger.error('Failed to delete speaking opportunity', {
        error: err instanceof Error ? err.message : String(err),
      });
      alert('Could not delete this opportunity.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error || !op) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="card p-8 text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">
              Opportunity not found
            </h1>
            <p className="text-star-300 mb-4">
              {error || 'This opportunity may have been removed or never approved.'}
            </p>
            <Link
              href="/speaking"
              className="inline-block text-sm py-2 px-4 rounded-lg border border-white/10 text-white hover:bg-white/[0.04]"
            >
              Back to Speaking Opportunities
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const deadlineDays = daysUntil(op.submissionDeadline);
  const eventDays = daysUntil(op.eventDate);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-4 text-sm">
          <Link href="/speaking" className="text-star-300 hover:text-white">
            ← Speaking Opportunities
          </Link>
        </div>

        <ScrollReveal>
          <div className="card p-6 md:p-8 mb-6 border border-white/[0.08]">
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {op.featured && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-black">
                  Featured
                </span>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-white/15 text-white/80">
                {op.isRemote ? 'Remote' : 'In-Person'}
              </span>
              {op.status !== 'approved' && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-amber-400/40 text-amber-300">
                  {op.status}
                </span>
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 leading-tight">
              {op.title}
            </h1>
            <p className="text-star-300 text-lg">
              {op.organization}
              {op.conferenceName ? ` · ${op.conferenceName}` : ''}
            </p>

            {/* Metadata grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Info label="Event date" value={formatDate(op.eventDate)} hint={eventDays !== null && eventDays >= 0 ? `${eventDays} days away` : null} />
              <Info
                label="Submission deadline"
                value={op.submissionDeadline ? formatDate(op.submissionDeadline) : 'Rolling / none'}
                hint={
                  deadlineDays !== null
                    ? deadlineDays < 0
                      ? 'Closed'
                      : `${deadlineDays} days left`
                    : null
                }
                hintClass={
                  deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 14
                    ? 'text-amber-300'
                    : deadlineDays !== null && deadlineDays < 0
                    ? 'text-red-400'
                    : 'text-star-400'
                }
              />
              <Info label="Topic" value={op.topic} />
              <Info label="Location" value={op.location || (op.isRemote ? 'Remote / virtual' : '—')} />
              <Info
                label="Compensation"
                value={op.compensation || '—'}
              />
              <Info
                label="Audience size"
                value={op.audienceSize ? op.audienceSize.toLocaleString() : '—'}
              />
            </div>

            {/* Tags */}
            {op.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-1.5">
                {op.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs text-star-300 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* CFP link */}
            {op.cfpUrl && (
              <div className="mt-6">
                <a
                  href={op.cfpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary py-2.5 px-5 text-sm font-semibold inline-block"
                >
                  View Call for Papers ↗
                </a>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Description */}
        <ScrollReveal delay={0.05}>
          <div className="card p-6 md:p-8 mb-6 border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-white mb-3">About this opportunity</h2>
            <div className="prose prose-invert max-w-none text-star-200 whitespace-pre-wrap text-sm leading-relaxed">
              {op.description}
            </div>
          </div>
        </ScrollReveal>

        {/* Contact */}
        <ScrollReveal delay={0.1}>
          <div className="card p-6 md:p-8 mb-6 border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            {isLoggedIn ? (
              op.contactEmail || op.contactName ? (
                <div className="space-y-1 text-sm">
                  {op.contactName && (
                    <p className="text-star-200">
                      <span className="text-star-400">Name:</span> {op.contactName}
                    </p>
                  )}
                  {op.contactEmail && (
                    <p className="text-star-200">
                      <span className="text-star-400">Email:</span>{' '}
                      <a
                        href={`mailto:${op.contactEmail}`}
                        className="text-white underline hover:no-underline"
                      >
                        {op.contactEmail}
                      </a>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-star-300">
                  No direct contact provided. Use the Call for Papers link above.
                </p>
              )
            ) : (
              <p className="text-sm text-star-300">
                <Link href="/login" className="text-white underline hover:no-underline">
                  Sign in
                </Link>{' '}
                to view contact details.
              </p>
            )}
          </div>
        </ScrollReveal>

        {/* Owner / admin actions */}
        {(isOwner || isAdmin) && (
          <div className="card p-5 border border-white/[0.08] flex flex-wrap items-center gap-3">
            <span className="text-sm text-star-300">
              {isAdmin ? 'Admin actions:' : 'Your submission:'}
            </span>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm py-1.5 px-3 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {isAdmin && (
              <Link
                href="/admin/speaking"
                className="text-sm py-1.5 px-3 rounded-lg border border-white/10 text-white hover:bg-white/[0.04]"
              >
                Moderation dashboard
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  hint,
  hintClass = 'text-star-400',
}: {
  label: string;
  value: string;
  hint?: string | null;
  hintClass?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-star-400 mb-0.5">{label}</p>
      <p className="text-white text-sm">{value}</p>
      {hint && <p className={`text-xs mt-0.5 ${hintClass}`}>{hint}</p>}
    </div>
  );
}
