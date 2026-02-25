'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SimilarCompany {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  subsector: string | null;
  tags: string[];
  tier: number;
  headquarters: string | null;
  totalFunding: number | null;
  similarityScore: number;
  reasons: string[];
}

interface SimilarCompaniesProps {
  companySlug: string;
  companyName: string;
}

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function getSectorIcon(s: string | null): string {
  const m: Record<string, string> = {
    launch: '🚀',
    satellite: '🛰️',
    defense: '🛡️',
    infrastructure: '🏗️',
    'ground-segment': '📡',
    manufacturing: '⚙️',
    analytics: '📊',
    agency: '🏛️',
    exploration: '🔭',
  };
  return m[s || ''] || '🏢';
}

function formatFunding(value: number | null): string {
  if (!value) return '';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function getReasonColor(reason: string): string {
  if (reason === 'Competitor') return 'bg-red-500/20 text-red-400';
  if (reason === 'Same sector') return 'bg-cyan-500/20 text-cyan-400';
  if (reason === 'Same subsector') return 'bg-blue-500/20 text-blue-400';
  if (reason.includes('Shared investors')) return 'bg-green-500/20 text-green-400';
  if (reason.includes('shared tags') || reason === 'Shared focus area')
    return 'bg-purple-500/20 text-purple-400';
  return 'bg-slate-700/50 text-slate-400';
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function SimilarCompanies({ companySlug, companyName }: SimilarCompaniesProps) {
  const [companies, setCompanies] = useState<SimilarCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSimilar() {
      try {
        const res = await fetch(`/api/company-profiles/${companySlug}/similar?limit=6`);
        if (res.ok) {
          const data = await res.json();
          setCompanies(data.companies || []);
        }
      } catch {
        // Silently fail - this is a supplementary feature
      } finally {
        setLoading(false);
      }
    }
    fetchSimilar();
  }, [companySlug]);

  if (loading) {
    return (
      <div className="card p-5 mb-4">
        <h3 className="text-lg font-semibold text-white mb-4">Similar Companies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-700 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-700/50 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (companies.length === 0) return null;

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Similar Companies
        </h3>
        <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
          {companies.length} found
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {companies.map((company, i) => (
          <Link key={company.id} href={`/company-profiles/${company.slug}`}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.02 }}
              className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 cursor-pointer hover:border-cyan-500/30 transition-colors h-full"
            >
              <div className="flex items-start gap-3">
                {/* Logo / Icon */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-lg flex-shrink-0 border border-slate-600/30">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt={`${company.name} logo`}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded object-contain"
                      unoptimized
                    />
                  ) : (
                    getSectorIcon(company.sector)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name */}
                  <h4 className="font-semibold text-white text-sm truncate">
                    {company.name}
                  </h4>

                  {/* Sector badge */}
                  {company.sector && (
                    <span className="text-xs text-cyan-400 capitalize">
                      {company.sector}
                    </span>
                  )}

                  {/* Funding */}
                  {company.totalFunding && company.totalFunding > 0 && (
                    <div className="text-xs text-emerald-400 font-mono mt-1">
                      {formatFunding(company.totalFunding)} raised
                    </div>
                  )}
                </div>

                {/* Similarity score indicator */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      company.similarityScore >= 60
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : company.similarityScore >= 30
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}
                    title={`Similarity score: ${company.similarityScore}`}
                  >
                    {company.similarityScore}
                  </div>
                </div>
              </div>

              {/* Reason badges */}
              <div className="flex flex-wrap gap-1 mt-3">
                {company.reasons.slice(0, 3).map((reason) => (
                  <span
                    key={reason}
                    className={`text-xs px-1.5 py-0.5 rounded ${getReasonColor(reason)}`}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
