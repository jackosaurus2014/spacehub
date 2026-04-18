'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TOPIC_LABELS: Record<string, string> = {
  'orbital-mechanics': 'Orbital Mechanics',
  'space-law': 'Space Law',
  propulsion: 'Propulsion',
  'supply-chain': 'Supply Chain',
  'startup-finance': 'Startup Finance',
  gnc: 'GNC',
  'rocket-equation': 'Rocket Equation',
  'space-policy': 'Space Policy',
  'satellite-systems': 'Satellite Systems',
  'space-medicine': 'Space Medicine',
  'mission-design': 'Mission Design',
  'earth-observation': 'Earth Observation',
  communications: 'Communications',
  cislunar: 'Cislunar',
  'deep-space': 'Deep Space',
  general: 'General',
};

const TOPIC_FILTERS = ['', ...Object.keys(TOPIC_LABELS)];

interface Group {
  id: string;
  slug: string;
  name: string;
  description: string;
  topic: string;
  meetingCadence: string | null;
  memberLimit: number | null;
  isPrivate: boolean;
  readingListCount: number;
  host: { id: string; name: string | null } | null;
  memberCount: number;
  meetingCount: number;
  createdAt: string;
}

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (topic) params.set('topic', topic);
      if (search) params.set('search', search);
      const res = await fetch(`/api/study-groups?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setGroups(json.data?.groups || []);
      }
    } finally {
      setLoading(false);
    }
  }, [topic, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
              Community
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Study Groups &amp; Reading Clubs
            </h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Learn alongside peers. Join a topic-focused group to share a reading list,
              schedule study meetings, and keep each other accountable.
            </p>
          </div>
          <Link
            href="/study-groups/new"
            className="px-4 py-2 rounded-md bg-indigo-500 hover:bg-indigo-400 text-white font-medium transition-colors"
          >
            Start a group
          </Link>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups…"
            className="flex-1 px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="px-3 py-2 rounded-md bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
          >
            {TOPIC_FILTERS.map((t) => (
              <option key={t || 'all'} value={t}>
                {t ? TOPIC_LABELS[t] : 'All topics'}
              </option>
            ))}
          </select>
          <Link
            href="/study-groups/my-groups"
            className="px-4 py-2 rounded-md bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] transition-colors text-center"
          >
            My groups
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading study groups…</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-lg">
            <p className="text-slate-300 mb-2">No study groups match your filters yet.</p>
            <Link
              href="/study-groups/new"
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Start the first one →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/study-groups/${g.slug}`}
                className="card p-5 hover:border-white/20 border border-white/[0.06] rounded-lg bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-white leading-snug">
                    {g.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex-shrink-0">
                    {TOPIC_LABELS[g.topic] || g.topic}
                  </span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                  {g.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span>{g.memberCount} members</span>
                  <span>·</span>
                  <span>{g.meetingCount} meetings</span>
                  <span>·</span>
                  <span>{g.readingListCount} readings</span>
                  {g.meetingCadence && (
                    <>
                      <span>·</span>
                      <span className="capitalize">{g.meetingCadence}</span>
                    </>
                  )}
                  {g.host?.name && (
                    <>
                      <span>·</span>
                      <span>Hosted by {g.host.name}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
