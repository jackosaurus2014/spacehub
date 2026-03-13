'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-4">Something went wrong</h2>
        <p className="text-slate-400 mb-6">{error.message || 'An unexpected error occurred'}</p>
        <button onClick={reset} className="px-6 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg transition-colors">
          Try again
        </button>
        <a href="/" className="block mt-3 text-sm text-slate-400 hover:text-white transition-colors">Go Home</a>
      </div>
    </div>
  );
}
