'use client';

import Link from 'next/link';

interface Suggestion {
  label: string;
  href: string;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  /** Optional quick-nav suggestions shown below the description */
  suggestions?: Suggestion[];
}

export default function EmptyState({ icon, title, description, action, suggestions }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-xl card">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
      </div>
      <div className="relative p-8 md:p-12 text-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-4 border border-white/[0.06] animate-float shadow-lg shadow-black/50">
          {icon}
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">{description}</p>
        {action && <div className="mt-4 md:mt-6 [&>a]:w-full [&>a]:md:w-auto [&>button]:w-full [&>button]:md:w-auto">{action}</div>}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/[0.04]">
            <p className="text-slate-500 text-xs mb-2">Try instead:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.1] text-xs text-slate-300 hover:text-white transition-all"
                >
                  {s.label}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
