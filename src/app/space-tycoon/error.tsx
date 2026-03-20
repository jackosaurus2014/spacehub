'use client';

export default function SpaceTycoonError({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-space-900 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Mission Failure</h2>
        <p className="text-slate-400 mb-4">Something went wrong with the simulation.</p>
        <button onClick={reset} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors">
          Restart Mission
        </button>
      </div>
    </div>
  );
}
