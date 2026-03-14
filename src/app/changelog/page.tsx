'use client';

import { useState, useMemo } from 'react';
import { CHANGELOG, getChangelogStats } from '@/lib/changelog';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

const typeStyles = {
  feature: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  improvement: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fix: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const typeLabels = {
  feature: 'New',
  improvement: 'Improved',
  fix: 'Fixed',
};

const typeIcons = {
  feature: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  improvement: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ),
  fix: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.59-5.59a2 2 0 010-2.83l.17-.17a2 2 0 012.83 0L14.42 12l5.59-5.59" />
    </svg>
  ),
};

type FilterType = 'all' | 'feature' | 'improvement' | 'fix';

export default function ChangelogPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const stats = useMemo(() => getChangelogStats(), []);

  const filteredChangelog = useMemo(() => {
    if (filter === 'all') return CHANGELOG;
    return CHANGELOG.map((entry) => ({
      ...entry,
      changes: entry.changes.filter((c) => c.type === filter),
    })).filter((entry) => entry.changes.length > 0);
  }, [filter]);

  const totalChanges = stats.features + stats.improvements + stats.fixes;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <AnimatedPageHeader
        title="Changelog"
        subtitle="Track every update, feature, and improvement we ship to SpaceNexus."
        accentColor="cyan"
      />

      {/* Stats Bar */}
      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-white/70">{stats.totalVersions}</div>
            <div className="text-xs text-slate-400 mt-1">Releases</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{stats.features}</div>
            <div className="text-xs text-slate-400 mt-1">New Features</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.improvements}</div>
            <div className="text-xs text-slate-400 mt-1">Improvements</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.fixes}</div>
            <div className="text-xs text-slate-400 mt-1">Fixes</div>
          </div>
        </div>
      </ScrollReveal>

      {/* Filter Tabs */}
      <ScrollReveal delay={0.15}>
        <div className="flex flex-wrap gap-2 mb-8">
          {([
            { key: 'all' as FilterType, label: `All (${totalChanges})`, color: 'slate' },
            { key: 'feature' as FilterType, label: `Features (${stats.features})`, color: 'emerald' },
            { key: 'improvement' as FilterType, label: `Improvements (${stats.improvements})`, color: 'blue' },
            { key: 'fix' as FilterType, label: `Fixes (${stats.fixes})`, color: 'amber' },
          ]).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === key
                  ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/40`
                  : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white/90 hover:border-white/[0.1]'
              }`}
              style={
                filter === key
                  ? {
                      backgroundColor:
                        color === 'slate'
                          ? 'rgba(100,116,139,0.2)'
                          : color === 'emerald'
                            ? 'rgba(16,185,129,0.2)'
                            : color === 'blue'
                              ? 'rgba(59,130,246,0.2)'
                              : 'rgba(245,158,11,0.2)',
                      color:
                        color === 'slate'
                          ? '#94a3b8'
                          : color === 'emerald'
                            ? '#34d399'
                            : color === 'blue'
                              ? '#60a5fa'
                              : '#fbbf24',
                      borderColor:
                        color === 'slate'
                          ? 'rgba(100,116,139,0.4)'
                          : color === 'emerald'
                            ? 'rgba(16,185,129,0.4)'
                            : color === 'blue'
                              ? 'rgba(59,130,246,0.4)'
                              : 'rgba(245,158,11,0.4)',
                    }
                  : {}
              }
            >
              {label}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Timeline */}
      <div className="space-y-6">
        {filteredChangelog.map((entry, index) => {
          const isLatest = index === 0 && filter === 'all';
          const isExpanded = expandedVersion === entry.version;
          const showAll = isLatest || isExpanded || entry.changes.length <= 6;
          const visibleChanges = showAll ? entry.changes : entry.changes.slice(0, 5);
          const hiddenCount = entry.changes.length - visibleChanges.length;

          return (
            <ScrollReveal key={entry.version} delay={index * 0.05}>
              <article
                className={`card p-6 relative overflow-hidden transition-all ${
                  isLatest ? 'ring-1 ring-white/10 bg-white/[0.06]' : ''
                }`}
              >
                {/* Latest badge */}
                {isLatest && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                      LATEST
                    </div>
                  </div>
                )}

                {/* Version header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-white/70 bg-white/5 px-3 py-1 rounded-md border border-white/10">
                      v{entry.version}
                    </span>
                    <time
                      className="text-sm text-slate-500"
                      dateTime={entry.date}
                    >
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </time>
                  </div>

                  {entry.highlight && (
                    <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 w-fit">
                      {entry.highlight}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-white mb-1">
                  {entry.title}
                </h2>
                <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                  {entry.description}
                </p>

                {/* Change type summary pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['feature', 'improvement', 'fix'] as const).map((type) => {
                    const count = entry.changes.filter((c) => c.type === type).length;
                    if (count === 0) return null;
                    return (
                      <span
                        key={type}
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeStyles[type]}`}
                      >
                        {count} {typeLabels[type].toLowerCase()}{count > 1 ? '' : ''}
                      </span>
                    );
                  })}
                </div>

                {/* Changes list */}
                <ul className="space-y-2.5">
                  {visibleChanges.map((change, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <span
                        className={`flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded border shrink-0 mt-0.5 ${typeStyles[change.type]}`}
                      >
                        {typeIcons[change.type]}
                        {typeLabels[change.type]}
                      </span>
                      <span className="text-sm text-white/70 leading-relaxed group-hover:text-slate-100 transition-colors">
                        {change.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Show more / less toggle */}
                {hiddenCount > 0 && (
                  <button
                    onClick={() =>
                      setExpandedVersion(isExpanded ? null : entry.version)
                    }
                    className="mt-4 text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded
                      ? 'Show less'
                      : `Show ${hiddenCount} more change${hiddenCount > 1 ? 's' : ''}`}
                  </button>
                )}
              </article>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Footer note */}
      <ScrollReveal delay={0.2}>
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            SpaceNexus ships updates continuously. This changelog covers major releases.
          </div>
          <p className="text-xs text-slate-600 mt-2">
            Have a feature request?{' '}
            <a href="/contact" className="text-white/70 hover:text-white transition-colors underline underline-offset-2">
              Let us know
            </a>
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
