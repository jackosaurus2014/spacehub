'use client';

export default function StatusError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-space-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-slate-400 mb-4">Unable to load platform status.</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
