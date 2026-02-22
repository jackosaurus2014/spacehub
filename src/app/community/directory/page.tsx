'use client';

import { useState, useEffect, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProfileCard from '@/components/community/ProfileCard';

interface ProfileData {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  location: string | null;
  linkedinUrl: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

const EXPERTISE_OPTIONS = [
  'All Expertise',
  'Propulsion Engineering',
  'Satellite Systems',
  'Mission Operations',
  'Space Policy',
  'Astrodynamics',
  'RF Engineering',
  'Business Development',
  'Space Finance',
  'Launch Services',
  'Ground Systems',
  'Data Analytics',
  'Software Engineering',
  'Mechanical Engineering',
  'Systems Engineering',
];

export default function DirectoryPage() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [expertise, setExpertise] = useState('');
  const [location, setLocation] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProfiles = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (expertise) params.set('expertise', expertise);
      if (location) params.set('location', location);
      params.set('page', String(pageNum));
      params.set('limit', '12');

      const res = await fetch(`/api/community/profiles?${params}`);
      if (res.ok) {
        const data = await res.json();
        const newProfiles = data.profiles || [];
        setProfiles((prev) => (append ? [...prev, ...newProfiles] : newProfiles));
        setHasMore(newProfiles.length === 12);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, expertise, location]);

  // Reset and fetch on filter change
  useEffect(() => {
    setPage(1);
    fetchProfiles(1, false);
  }, [fetchProfiles]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProfiles(nextPage, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Professional Directory"
          subtitle="Discover and connect with space industry professionals worldwide."
          icon={<span>{"📋"}</span>}
          breadcrumb="Community"
        />

        {/* Search + Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, headline, or expertise..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>

            {/* Expertise filter */}
            <select
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 min-w-[180px]"
            >
              {EXPERTISE_OPTIONS.map((opt) => (
                <option key={opt} value={opt === 'All Expertise' ? '' : opt}>
                  {opt}
                </option>
              ))}
            </select>

            {/* Location filter */}
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location..."
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 sm:w-[160px]"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && profiles.length === 0 && (
          <div className="text-center py-20">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">No profiles found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {search || expertise || location
                ? 'Try adjusting your search filters to find more professionals.'
                : 'Be the first to create a profile and join the community.'}
            </p>
          </div>
        )}

        {/* Profiles grid */}
        {!loading && profiles.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {profiles.map((profile, idx) => (
                <ProfileCard key={profile.id} profile={profile} index={idx} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700/50 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Loading...
                    </>
                  ) : (
                    'Load More Profiles'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
