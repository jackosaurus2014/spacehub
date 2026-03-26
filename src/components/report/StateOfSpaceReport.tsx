'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MonthlyReport, MonthlyReportSection, ReportStatCard, ReportHeadline, ReportDeal, ReportLaunch, ReportCompanyMover, ReportEvent } from '@/lib/monthly-report-generator';

// ─── Icon Components ────────────────────────────────────────────────────────

function SectionIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    rocket: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
    dollar: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    chart: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    shield: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    cpu: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
    calendar: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    pulse: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  };
  return <>{iconMap[icon] || iconMap.pulse}</>;
}

// ─── Section color mapping ──────────────────────────────────────────────────

const SECTION_COLORS: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  'launch-activity': { border: 'border-orange-500/20', bg: 'bg-orange-500/5', text: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400' },
  'funding-investment': { border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400' },
  'market-movers': { border: 'border-blue-500/20', bg: 'bg-blue-500/5', text: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400' },
  'regulatory-watch': { border: 'border-amber-500/20', bg: 'bg-amber-500/5', text: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400' },
  'technology-milestones': { border: 'border-purple-500/20', bg: 'bg-purple-500/5', text: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400' },
  'month-ahead': { border: 'border-cyan-500/20', bg: 'bg-cyan-500/5', text: 'text-cyan-400', badge: 'bg-cyan-500/10 text-cyan-400' },
  'industry-pulse': { border: 'border-slate-500/20', bg: 'bg-slate-500/5', text: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-400' },
};

function getSectionColor(id: string) {
  return SECTION_COLORS[id] || SECTION_COLORS['industry-pulse'];
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCardGrid({ stats, sectionId }: { stats: ReportStatCard[]; sectionId: string }) {
  const color = getSectionColor(sectionId);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:border-white/[0.08] transition-colors">
          <p className="text-xl md:text-2xl font-bold text-white tracking-tight">{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          {stat.sublabel && <p className="text-[10px] text-slate-600 mt-0.5">{stat.sublabel}</p>}
          {stat.change && (
            <p className={`text-[11px] mt-1 font-medium ${
              stat.changeType === 'positive' ? 'text-emerald-400' :
              stat.changeType === 'negative' ? 'text-red-400' :
              color.text
            }`}>
              {stat.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function HeadlineList({ headlines }: { headlines: ReportHeadline[] }) {
  if (!headlines || headlines.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Notable Headlines</p>
      {headlines.map((h, i) => (
        <div key={i} className="flex items-start gap-3 group">
          <span className="flex-shrink-0 w-1 h-1 rounded-full bg-white/20 mt-2" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 leading-snug group-hover:text-white transition-colors">{h.title}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {h.source}{h.date ? ` \u00B7 ${h.date}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DealTable({ deals }: { deals: ReportDeal[] }) {
  if (!deals || deals.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium mb-2">Top Deals</p>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-600">
              <th className="text-left px-2 pb-2 font-medium">Company</th>
              <th className="text-left px-2 pb-2 font-medium">Amount</th>
              <th className="text-left px-2 pb-2 font-medium hidden sm:table-cell">Stage</th>
              <th className="text-left px-2 pb-2 font-medium hidden md:table-cell">Lead Investor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {deals.map((d, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-2 py-2">
                  {d.slug ? (
                    <Link href={`/company-profiles/${d.slug}`} className="text-white hover:text-cyan-400 transition-colors font-medium">
                      {d.company}
                    </Link>
                  ) : (
                    <span className="text-white font-medium">{d.company}</span>
                  )}
                </td>
                <td className="px-2 py-2 text-emerald-400 font-semibold">{d.amount}</td>
                <td className="px-2 py-2 text-slate-500 hidden sm:table-cell">{d.stage}</td>
                <td className="px-2 py-2 text-slate-500 hidden md:table-cell">{d.leadInvestor || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LaunchList({ launches, label }: { launches: ReportLaunch[]; label: string }) {
  if (!launches || launches.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium mb-2">{label}</p>
      <div className="space-y-2">
        {launches.map((l, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/[0.015] rounded-lg p-3 border border-white/[0.03]">
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
              l.status === 'completed' ? 'bg-emerald-400' :
              l.status === 'go' ? 'bg-green-400' :
              l.status === 'upcoming' ? 'bg-blue-400' :
              l.status === 'scrubbed' ? 'bg-red-400' :
              'bg-slate-500'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{l.name}</p>
              <p className="text-[10px] text-slate-500">
                {l.date}{l.agency ? ` \u00B7 ${l.agency}` : ''}{l.rocket ? ` \u00B7 ${l.rocket}` : ''}
              </p>
            </div>
            <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${
              l.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
              l.status === 'go' ? 'bg-green-500/10 text-green-400' :
              l.status === 'upcoming' ? 'bg-blue-500/10 text-blue-400' :
              l.status === 'scrubbed' ? 'bg-red-500/10 text-red-400' :
              'bg-slate-500/10 text-slate-400'
            }`}>
              {l.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoverList({ movers }: { movers: ReportCompanyMover[] }) {
  if (!movers || movers.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium mb-2">Movers &amp; Shakers</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {movers.map((m, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/[0.015] rounded-lg p-3 border border-white/[0.03]">
            <div className="flex-1 min-w-0">
              {m.slug ? (
                <Link href={`/company-profiles/${m.slug}`} className="text-sm text-white font-medium hover:text-cyan-400 transition-colors truncate block">
                  {m.name}
                </Link>
              ) : (
                <p className="text-sm text-white font-medium truncate">{m.name}</p>
              )}
              <p className="text-[10px] text-slate-500">{m.ticker}{m.marketCap ? ` \u00B7 ${m.marketCap}` : ''}</p>
            </div>
            <span className={`flex-shrink-0 text-sm font-bold ${
              (m.priceChange || 0) > 0 ? 'text-emerald-400' :
              (m.priceChange || 0) < 0 ? 'text-red-400' : 'text-slate-400'
            }`}>
              {(m.priceChange || 0) > 0 ? '+' : ''}{(m.priceChange || 0).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventList({ events }: { events: ReportEvent[] }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Key Events</p>
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 text-[10px] text-slate-600 font-mono mt-0.5 w-20">{e.date}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 leading-snug">{e.title}</p>
            {e.company && <p className="text-[10px] text-slate-500 mt-0.5">{e.company}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Report Section Component ───────────────────────────────────────────────

function ReportSection({ section, index }: { section: MonthlyReportSection; index: number }) {
  const color = getSectionColor(section.id);

  return (
    <section
      id={section.id}
      className={`rounded-2xl border ${color.border} ${color.bg} p-6 md:p-8 transition-all`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${color.border} bg-black/40 ${color.text}`}>
          <SectionIcon icon={section.icon} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{section.title}</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-600">Section {index + 1}</p>
        </div>
      </div>

      {/* Stat Cards */}
      {section.stats.length > 0 && (
        <StatCardGrid stats={section.stats} sectionId={section.id} />
      )}

      {/* Narrative */}
      {section.narrative && (
        <p className="text-sm text-slate-400 leading-relaxed mt-4">{section.narrative}</p>
      )}

      {/* Contextual Data */}
      {section.launches && <LaunchList launches={section.launches} label="Notable Launches" />}
      {section.upcomingLaunches && <LaunchList launches={section.upcomingLaunches} label="Upcoming Launches" />}
      {section.deals && <DealTable deals={section.deals} />}
      {section.movers && <MoverList movers={section.movers} />}
      {section.headlines && <HeadlineList headlines={section.headlines} />}
      {section.events && <EventList events={section.events} />}
    </section>
  );
}

// ─── Newsletter Signup CTA ──────────────────────────────────────────────────

function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'monthly-report-cta' }),
      });
      const data = await res.json();
      if (res.ok || data.code === 'ALREADY_SUBSCRIBED') {
        setStatus('success');
        setMessage(data.code === 'ALREADY_SUBSCRIBED' ? 'You\'re already subscribed!' : 'You\'re in! Check your inbox.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 md:p-12 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{message}</h3>
        <p className="text-sm text-slate-400">The next State of Space report will land in your inbox.</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-purple-600/5 to-transparent" />
      <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/5 rounded-full blur-[80px]" />

      <div className="relative p-8 md:p-12">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/[0.04] border border-white/[0.08] rounded-full text-xs text-slate-400 font-medium mb-4">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Free Monthly Delivery
          </div>

          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Get State of Space in Your Inbox
          </h3>
          <p className="text-slate-400 mb-6">
            Join thousands of space professionals who receive this report every month.
            Data-driven intelligence, no spam, unsubscribe anytime.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              disabled={status === 'loading'}
              className="flex-1 px-4 py-3 bg-black/60 border border-white/[0.08] rounded-xl text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-500/30 focus:ring-1 focus:ring-cyan-500/20 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 text-sm font-semibold text-black bg-white hover:bg-slate-100 disabled:opacity-50 rounded-xl transition-all flex-shrink-0"
            >
              {status === 'loading' ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Subscribing...
                </span>
              ) : 'Subscribe Free'}
            </button>
          </form>

          {status === 'error' && message && (
            <p className="text-sm text-red-400 mt-3">{message}</p>
          )}

          <div className="flex flex-wrap justify-center gap-4 mt-5 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No spam, ever
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Unsubscribe anytime
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              50+ data sources
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Table of Contents Navigation ───────────────────────────────────────────

function ReportTableOfContents({ sections }: { sections: MonthlyReportSection[] }) {
  return (
    <nav className="hidden lg:block sticky top-24 w-48 space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-slate-600 font-medium mb-3">Sections</p>
      {sections.map((s, i) => {
        const color = getSectionColor(s.id);
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-white hover:bg-white/[0.03] transition-all group"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${color.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
            <span className="truncate">{s.title}</span>
          </a>
        );
      })}
    </nav>
  );
}

// ─── Main Report Component ──────────────────────────────────────────────────

interface StateOfSpaceReportProps {
  report: MonthlyReport | null;
}

export default function StateOfSpaceReport({ report }: StateOfSpaceReportProps) {
  if (!report) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">Report data is being generated...</p>
          <Link href="/market-intel" className="text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-2">
            View Market Intelligence
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-white/[0.04]">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-purple-500/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8 md:pt-20 md:pb-12">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full text-slate-400 text-xs font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Report #{report.reportNumber} &middot; Updated {new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-[1.1] tracking-tight">
              State of Space
            </h1>
            <p className="text-xl md:text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-slate-300 via-cyan-200 to-slate-300 mb-4">
              {report.month}
            </p>
            <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
              A data-driven analysis of launch activity, funding, market movements, regulatory changes, and technology milestones across the global space industry.
            </p>

            {/* Quick stats bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Live Data
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
                50+ Sources
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
                {report.sections.length} Sections
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Refreshed Hourly
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Report Body ────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex gap-10">
          {/* Sidebar TOC (desktop only) */}
          <ReportTableOfContents sections={report.sections} />

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Mobile section jump bar */}
            <div className="lg:hidden overflow-x-auto -mx-4 px-4 pb-2">
              <div className="flex gap-2">
                {report.sections.map(s => {
                  const color = getSectionColor(s.id);
                  return (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border border-white/[0.06] ${color.text} bg-black/60 hover:bg-white/[0.03] transition-colors`}
                    >
                      {s.title}
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Sections */}
            {report.sections.map((section, i) => (
              <ReportSection key={section.id} section={section} index={i} />
            ))}

            {/* Newsletter CTA */}
            <NewsletterCTA />

            {/* Footer Links */}
            <div className="text-center space-y-4 pt-6 pb-8">
              <p className="text-xs text-slate-600">
                Published by the SpaceNexus Intelligence Team using data from NASA, NOAA, SEC, CelesTrak, SAM.gov, and 50+ additional sources.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                <Link href="/report/state-of-space-2026" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
                  Annual Report
                </Link>
                <span className="text-white/10">|</span>
                <Link href="/market-intel" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
                  Market Intelligence
                </Link>
                <span className="text-white/10">|</span>
                <Link href="/funding-rounds" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
                  Funding Tracker
                </Link>
                <span className="text-white/10">|</span>
                <Link href="/company-profiles" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
                  Company Profiles
                </Link>
                <span className="text-white/10">|</span>
                <Link href="/blog" className="text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
                  Blog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
