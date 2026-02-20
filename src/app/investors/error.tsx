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
    console.error('Investor hub error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-white mb-2">Investor Hub Error</h2>
        <p className="text-sm text-slate-400 mb-6">
          We encountered an error loading the investor hub. Please try again or return to the main investor page.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/investors"
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Back to Investor Hub
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-600 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
