'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import MentorCard, { MentorCardData } from '@/components/mentors/MentorCard';
import { clientLogger } from '@/lib/client-logger';

const EXPERTISE_OPTIONS = [
  'Propulsion',
  'Avionics',
  'Systems Engineering',
  'Mission Design',
  'Regulatory',
  'Business Development',
  'Fundraising',
  'Manufacturing',
  'Software',
  'Career Transition',
];

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<MentorCardData[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expertise, setExpertise] = useState('');
  const [acceptingOnly, setAcceptingOnly] = useState(true);
  const [page, setPage] = useState(1);

  const fetchMentors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '24' });
      if (search) params.set('search', search);
      if (expertise) params.set('expertise', expertise);
      if (acceptingOnly) params.set('acceptingMentees', 'true');

      const res = await fetch(`/api/mentors?${params.toString()}`);
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to load mentors');
      }
      setMentors(body.data.mentors);
      setPagination(body.data.pagination);
    } catch (err) {
      clientLogger.error('Failed to fetch mentors', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to load mentors. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, expertise, acceptingOnly]);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  return (
    <div className="min-h-screen bg-space-900 pb-16">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Mentors"
          subtitle="Connect with experienced space industry advisors — engineering, regulatory, fundraising, and career guidance"
          accentColor="purple"
        >
          <Link href="/space-talent" className="btn-secondary text-sm py-2 px-4">
            Space Talent Hub
          </Link>
        </AnimatedPageHeader>

        {/* Filters */}
        <div className="card p-4 mb-8 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label htmlFor="mentor-search" className="block text-xs font-medium text-slate-400 mb-1">
              Search
            </label>
            <input
              id="mentor-search"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Headline or bio keywords..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-white/20"
            />
          </div>
          <div>
            <label htmlFor="mentor-expertise" className="block text-xs font-medium text-slate-400 mb-1">
              Expertise
            </label>
            <select
              id="mentor-expertise"
              value={expertise}
              onChange={(e) => { setExpertise(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-white/20"
            >
              <option value="">All areas</option>
              {EXPERTISE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 pb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptingOnly}
              onChange={(e) => { setAcceptingOnly(e.target.checked); setPage(1); }}
              className="rounded border-white/20 bg-white/[0.04]"
            />
            Accepting mentees
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><LoadingSpinner /></div>
        ) : error ? (
          <EmptyState
            reason="This is a fetch failure, not an empty directory — the mentor list could not be loaded at all. Retrying usually clears it; if it persists, the API is down."
            icon="⚠️"
            title="Something went wrong"
            description={error}
            action={
              <button onClick={fetchMentors} className="btn-primary px-6 py-2 text-sm">
                Retry
              </button>
            }
          />
        ) : mentors.length === 0 ? (
          <EmptyState
            reason="Mentors opt in from their Space Talent profile, so coverage varies by speciality. This list fills as more members opt in."
            icon="🧑‍🚀"
            title="No mentors found"
            description="Try broadening your filters — or become the first mentor in this area via your Space Talent profile."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentors.map((mentor, i) => (
                <MentorCard key={mentor.id} mentor={mentor} index={i} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
