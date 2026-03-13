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
    console.error('Jobs page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4" aria-hidden="true">
          &#x1F680;
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Jobs Board Error
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          Something went wrong loading the jobs board. Please try again or
          return to the homepage.
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
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
        </div>
        {error.digest && (
          <p className="text-xs text-slate-600 mt-4">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
