'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

const AGENCIES = ['FCC', 'FAA', 'DOD', 'NOAA', 'FTC', 'NASA', 'DOC', 'State'];
const CATEGORIES = [
  { value: 'licensing', label: 'Licensing' },
  { value: 'spectrum', label: 'Spectrum' },
  { value: 'export_control', label: 'Export Control' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'safety', label: 'Safety' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'defense', label: 'Defense' },
  { value: 'international', label: 'International' },
];
const IMPACT_LEVELS = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

function getImpactBadge(level: string) {
  const found = IMPACT_LEVELS.find((l) => l.value === level);
  return found || IMPACT_LEVELS[2];
}

function ExplainersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [explainers, setExplainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [agency, setAgency] = useState(searchParams.get('agency') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [impactLevel, setImpactLevel] = useState(searchParams.get('impact') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const fetchExplainers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agency) params.set('agency', agency);
      if (category) params.set('category', category);
      if (impactLevel) params.set('impactLevel', impactLevel);
      if (search) params.set('search', search);
      params.set('limit', '20');
      params.set('offset', String((page - 1) * 20));

      const res = await fetch(`/api/regulation-explainers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setExplainers(data.explainers || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch explainers', err);
    } finally {
      setLoading(false);
    }
  }, [agency, category, impactLevel, search, page]);

  useEffect(() => {
    fetchExplainers();
  }, [fetchExplainers]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Regulation Explainers"
          subtitle="AI-generated plain-English summaries of space industry regulations"
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={agency}
            onChange={(e) => { setAgency(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Agencies</option>
            {AGENCIES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={impactLevel}
            onChange={(e) => { setImpactLevel(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Impact Levels</option>
            {IMPACT_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search regulations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white flex-1 min-w-[200px]"
          />

          <div className="text-sm text-slate-400">
            {total} result{total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20"><LoadingSpinner /></div>
        ) : explainers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {explainers.map((exp, i) => {
              const impact = getImpactBadge(exp.impactLevel);
              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/regulation-explainers/${exp.slug}`}>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-cyan-500/30 transition-all cursor-pointer h-full flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${impact.color}`}>
                          {impact.label}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300 font-medium">
                          {exp.agency}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-400">
                          {exp.category}
                        </span>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                        {exp.title}
                      </h3>
                      <p className="text-slate-400 text-xs mb-3 line-clamp-3 flex-1">
                        {exp.summary}
                      </p>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-2 border-t border-slate-700/50">
                        <span>
                          {new Date(exp.generatedAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-3">
                          {exp.regulationDocketNumber && (
                            <span className="text-slate-500">{exp.regulationDocketNumber}</span>
                          )}
                          <span>{exp.viewCount} views</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📜</div>
            <div className="text-slate-400 text-sm">No regulation explainers found.</div>
            <p className="text-slate-500 text-xs mt-2">Explainers are generated from proposed regulations and legal updates.</p>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-400">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegulationExplainersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <ExplainersContent />
    </Suspense>
  );
}
