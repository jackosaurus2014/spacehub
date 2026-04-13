'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import { motion } from 'framer-motion';

function fmt(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function ProposalIntelligencePage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('3y');

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?returnTo=/intelligence/proposals');
      return;
    }
    if (sessionStatus !== 'authenticated') return;

    setLoading(true);
    fetch(`/api/intelligence/proposal-analytics?period=${period}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => { setData(d?.data || d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionStatus, period, router]);

  if (sessionStatus === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">Unable to load proposal analytics.</p>
      </div>
    );
  }

  const { summary, byAgency, byNaics, bySetAside, byType, byYear, proposalStats, ratings, topAwardees, recentAwards } = data;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <AnimatedPageHeader title="Proposal Intelligence" subtitle="Contract win analysis, pricing intelligence, and competitive benchmarking" />
          <div className="flex items-center gap-1 bg-white/[0.06] rounded-lg p-1">
            {['1y', '2y', '3y', '5y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${period === p ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Contracts', value: summary.totalContracts.toLocaleString(), color: 'text-white' },
            { label: 'Total Value', value: fmt(summary.totalValue), color: 'text-emerald-400' },
            { label: 'Avg Contract', value: fmt(summary.avgValue), color: 'text-blue-400' },
            { label: 'Largest', value: summary.largestContract?.value ? fmt(summary.largestContract.value) : 'N/A', color: 'text-yellow-400' },
          ].map((stat, i) => (
            <StaggerItem key={stat.label}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card p-5 text-center">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Agency */}
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Contracts by Agency</h3>
              <div className="space-y-2">
                {(byAgency || []).map((a: any) => (
                  <div key={a.agency} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white font-medium">{a.agency}</span>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{a.count} awards</span>
                      <span className="text-emerald-400 font-medium">{fmt(a.totalValue)}</span>
                    </div>
                  </div>
                ))}
                {(!byAgency || byAgency.length === 0) && <p className="text-xs text-slate-500">No contract data available</p>}
              </div>
            </div>
          </ScrollReveal>

          {/* By Year */}
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Contract Awards by Year</h3>
              <div className="space-y-2">
                {(byYear || []).map((y: any) => (
                  <div key={y.year} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white font-medium">{y.year}</span>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{y.count} awards</span>
                      <span className="text-emerald-400 font-medium">{fmt(y.totalValue)}</span>
                    </div>
                  </div>
                ))}
                {(!byYear || byYear.length === 0) && <p className="text-xs text-slate-500">No yearly data available</p>}
              </div>
            </div>
          </ScrollReveal>

          {/* Top Awardees */}
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top Contract Awardees</h3>
              <div className="space-y-2">
                {(topAwardees || []).map((a: any, i: number) => (
                  <div key={a.companyName} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-5">{i + 1}.</span>
                      <span className="text-white font-medium">{a.companyName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{a.count} awards</span>
                      <span className="text-emerald-400 font-medium">{fmt(a.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Set-Aside & Type */}
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Set-Aside Distribution</h3>
              <div className="space-y-2 mb-6">
                {(bySetAside || []).map((s: any) => (
                  <div key={s.setAside} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white font-medium">{s.setAside.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{s.count}</span>
                      <span className="text-emerald-400">{fmt(s.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-white mb-4">Contract Types</h3>
              <div className="space-y-2">
                {(byType || []).map((t: any) => (
                  <div key={t.type} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white font-medium">{t.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{t.count}</span>
                      <span className="text-emerald-400">{fmt(t.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Proposal Win Rate (if company-specific) */}
        {proposalStats && (
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Proposal Performance</h3>
              <StaggerContainer className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: 'Submitted', value: proposalStats.submitted, color: 'text-blue-400' },
                  { label: 'Shortlisted', value: proposalStats.shortlisted, color: 'text-yellow-400' },
                  { label: 'Awarded', value: proposalStats.awarded, color: 'text-emerald-400' },
                  { label: 'Rejected', value: proposalStats.rejected, color: 'text-red-400' },
                  { label: 'Withdrawn', value: proposalStats.withdrawn, color: 'text-slate-400' },
                  { label: 'Win Rate', value: `${proposalStats.winRate}%`, color: 'text-white' },
                ].map(s => (
                  <StaggerItem key={s.label}>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </ScrollReveal>
        )}

        {/* Provider Ratings */}
        {ratings && ratings.reviewCount > 0 && (
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Provider Ratings ({ratings.reviewCount} reviews)</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {[
                  { label: 'Overall', value: ratings.overall },
                  { label: 'Quality', value: ratings.quality },
                  { label: 'Timeline', value: ratings.timeline },
                  { label: 'Communication', value: ratings.communication },
                  { label: 'Value', value: ratings.value },
                ].map(r => (
                  <div key={r.label}>
                    <div className="text-xl font-bold text-yellow-400">{r.value?.toFixed(1) || 'N/A'}</div>
                    <div className="text-xs text-slate-500 mt-1">{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* NAICS Codes */}
        {byNaics && byNaics.length > 0 && (
          <ScrollReveal>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Top NAICS Codes</h3>
              <div className="space-y-2">
                {byNaics.map((n: any) => (
                  <div key={n.naicsCode} className="flex items-center justify-between text-xs py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-white font-mono">{n.naicsCode}</span>
                    <div className="flex items-center gap-4 text-slate-400">
                      <span>{n.count} contracts</span>
                      <span className="text-emerald-400">{fmt(n.totalValue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* Recent Awards */}
        <ScrollReveal>
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Recent Contract Awards</h3>
            <div className="space-y-3">
              {(recentAwards || []).slice(0, 15).map((a: any, i: number) => (
                <div key={i} className="py-3 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">{a.title}</div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2">
                        <span className="font-medium">{a.companyName}</span>
                        <span>{a.agency}</span>
                        {a.setAside && a.setAside !== 'none' && (
                          <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">{a.setAside.replace(/_/g, ' ')}</span>
                        )}
                        {a.naicsCode && <span className="font-mono text-slate-500">{a.naicsCode}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-400">{a.value ? fmt(a.value) : 'N/A'}</div>
                      <div className="text-xs text-slate-500">{a.awardDate ? new Date(a.awardDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!recentAwards || recentAwards.length === 0) && <p className="text-xs text-slate-500">No recent awards found</p>}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
