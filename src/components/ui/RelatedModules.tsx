'use client';

import Link from 'next/link';

interface RelatedModule {
  name: string;
  description: string;
  href: string;
  icon: string;
}

export default function RelatedModules({ modules, title = 'Related Intelligence' }: { modules: RelatedModule[]; title?: string }) {
  return (
    <div className="mt-12 pt-8 border-t border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-cyan-500/30 hover:bg-slate-800 transition-all group"
          >
            <span className="text-xl shrink-0">{mod.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">{mod.name}</div>
              <div className="text-xs text-slate-400 truncate">{mod.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
