'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Space Edge Computing] error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4" aria-hidden="true">
          <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0015.75 4.5h-9A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Space Edge Computing Error</h2>
        <p className="text-sm text-slate-400 mb-6">
          We encountered an error loading space edge computing data. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-sm rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-white/[0.08] hover:bg-white/[0.1] text-white text-sm rounded-lg font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-600 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
