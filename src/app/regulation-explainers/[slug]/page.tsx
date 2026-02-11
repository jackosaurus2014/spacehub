'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

const IMPACT_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export default function RegulationExplainerDetailPage() {
  const { slug } = useParams();
  const [explainer, setExplainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchExplainer() {
      try {
        const res = await fetch(`/api/regulation-explainers/${slug}`);
        if (res.ok) {
          setExplainer(await res.json());
        } else if (res.status === 404) {
          setError('Regulation explainer not found.');
        } else {
          setError('Failed to load explainer.');
        }
      } catch {
        setError('Failed to load explainer.');
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchExplainer();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !explainer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">📜</div>
        <p className="text-slate-400">{error || 'Not found'}</p>
        <Link href="/regulation-explainers" className="text-cyan-400 hover:underline text-sm">
          Back to Regulation Explainers
        </Link>
      </div>
    );
  }

  const impactColor = IMPACT_COLORS[explainer.impactLevel] || IMPACT_COLORS.medium;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/regulation-explainers"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Regulation Explainers
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`px-2.5 py-1 rounded text-xs font-semibold border ${impactColor}`}>
                {explainer.impactLevel.toUpperCase()} IMPACT
              </span>
              <span className="px-2.5 py-1 bg-slate-700 rounded text-xs text-slate-300 font-medium">
                {explainer.agency}
              </span>
              <span className="px-2.5 py-1 bg-slate-700/50 rounded text-xs text-slate-400">
                {explainer.category}
              </span>
              {explainer.regulationDocketNumber && (
                <span className="px-2.5 py-1 bg-slate-700/50 rounded text-xs text-slate-500">
                  Docket: {explainer.regulationDocketNumber}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{explainer.title}</h1>
            <p className="text-slate-300 text-base leading-relaxed">{explainer.summary}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
              <span>Generated {new Date(explainer.generatedAt).toLocaleDateString()}</span>
              <span>{explainer.viewCount} views</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
              {explainer.content}
            </div>
          </div>

          {/* Structured Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {explainer.whatItMeans && (
              <div className="bg-slate-800/50 border border-blue-500/20 rounded-xl p-5">
                <h3 className="text-blue-400 font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="text-lg">💡</span> What It Means
                </h3>
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                  {explainer.whatItMeans}
                </div>
              </div>
            )}

            {explainer.whoItAffects && (
              <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-5">
                <h3 className="text-purple-400 font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="text-lg">👥</span> Who It Affects
                </h3>
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                  {explainer.whoItAffects}
                </div>
              </div>
            )}

            {explainer.whatToDoNext && (
              <div className="bg-slate-800/50 border border-green-500/20 rounded-xl p-5">
                <h3 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
                  <span className="text-lg">✅</span> What To Do Next
                </h3>
                <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                  {explainer.whatToDoNext}
                </div>
              </div>
            )}
          </div>

          {/* Affected Company Types */}
          {explainer.affectedCompanyTypes && explainer.affectedCompanyTypes.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5 mb-6">
              <h3 className="text-slate-300 font-semibold text-sm mb-3">Affected Company Types</h3>
              <div className="flex flex-wrap gap-2">
                {explainer.affectedCompanyTypes.map((type: string) => (
                  <span key={type} className="px-2.5 py-1 bg-slate-700 rounded-full text-xs text-slate-300">
                    {type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {explainer.sourceUrls && explainer.sourceUrls.length > 0 && (
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
              <h3 className="text-slate-300 font-semibold text-sm mb-3">Sources</h3>
              <ul className="space-y-1">
                {explainer.sourceUrls.map((url: string, i: number) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline text-xs break-all"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
