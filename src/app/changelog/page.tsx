'use client';

import { CHANGELOG } from '@/lib/changelog';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';

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

export default function ChangelogPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <AnimatedPageHeader
        title="What's New"
        subtitle="Latest updates and improvements to SpaceNexus"
      />

      <div className="space-y-10 mt-8">
        {CHANGELOG.map((entry) => (
          <article
            key={entry.version}
            className="relative pl-8 border-l-2 border-slate-700/50"
          >
            {/* Timeline dot */}
            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-cyan-500 border-2 border-slate-900" />

            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                v{entry.version}
              </span>
              <time className="text-xs text-slate-500" dateTime={entry.date}>
                {new Date(entry.date).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
            </div>

            <h2 className="text-white font-semibold text-lg mb-1">{entry.title}</h2>
            <p className="text-slate-400 text-sm mb-4">{entry.description}</p>

            <ul className="space-y-2">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${typeStyles[change.type]}`}
                  >
                    {typeLabels[change.type]}
                  </span>
                  <span className="text-sm text-slate-300">{change.text}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
