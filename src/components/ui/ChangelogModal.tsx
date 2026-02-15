'use client';

import { useState, useEffect } from 'react';
import { CHANGELOG, getNewEntries, getLatestVersion, type ChangelogEntry } from '@/lib/changelog';

const STORAGE_KEY = 'spacenexus-last-seen-version';

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

export default function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [newEntries, setNewEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    const latest = getLatestVersion();

    if (lastSeen !== latest) {
      const entries = getNewEntries(lastSeen);
      if (entries.length > 0) {
        setNewEntries(entries);
        setIsOpen(true);
      }
    }
  }, []);

  function handleClose() {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, getLatestVersion());
  }

  if (!isOpen || newEntries.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <div>
            <h2 className="text-lg font-bold text-white">What&apos;s New</h2>
            <p className="text-sm text-slate-400">Recent updates to SpaceNexus</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-6">
          {newEntries.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-mono font-bold text-nebula-400 bg-nebula-500/10 px-2 py-0.5 rounded">
                  v{entry.version}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <h3 className="text-white font-semibold mb-1">{entry.title}</h3>
              <p className="text-slate-400 text-sm mb-3">{entry.description}</p>
              <ul className="space-y-2">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${typeStyles[change.type]}`}
                    >
                      {typeLabels[change.type]}
                    </span>
                    <span className="text-sm text-slate-300">{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50">
          <button
            onClick={handleClose}
            className="w-full bg-nebula-500 hover:bg-nebula-600 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
