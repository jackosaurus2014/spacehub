'use client';

export default function DataSourcesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a0a0a] to-black flex items-center justify-center px-4">
      <div className="card p-8 max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load Data Sources</h2>
        <p className="text-sm text-slate-400 mb-6">
          {error.message || 'An unexpected error occurred while loading the data sources page.'}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-sm font-semibold rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
