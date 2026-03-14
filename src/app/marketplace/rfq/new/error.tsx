'use client';

import Link from 'next/link';
import { clientLogger } from '@/lib/client-logger';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    clientLogger.error('Page error', { page: 'marketplace-rfq-new', message: error.message });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-4xl">{'\u{1F4CB}'}</div>
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="text-sm text-slate-400 max-w-md">{error.message || 'An unexpected error occurred.'}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-sm rounded-lg transition-colors">
            Try Again
          </button>
          <Link href="/marketplace" className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.1] text-white text-sm rounded-lg transition-colors">
            Go Back
          </Link>
        </div>
      </div>
    </div>
  );
}
