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
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-white mb-2">Market Sizing Error</h2>
        <p className="text-sm text-slate-400 mb-6">
          Something went wrong loading this page. Please try again or go back.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/market-sizing"
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Go Back
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-600 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
