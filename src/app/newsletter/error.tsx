'use client';

import { useEffect } from 'react';

export default function NewsletterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Newsletter page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white mb-3">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-6">
          We encountered an error loading the newsletter page. Please try again.
        </p>

        <button
          onClick={reset}
          className="px-6 py-2.5 bg-white text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
