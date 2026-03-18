'use client';

import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-4">&#128230;</div>
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 mb-6 text-sm">
          {error.message || 'An unexpected error occurred while loading export classification data.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-lg font-medium transition-colors min-h-[44px]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white/[0.08] hover:bg-white/[0.1] text-white rounded-lg font-medium transition-colors text-center min-h-[44px] flex items-center justify-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
