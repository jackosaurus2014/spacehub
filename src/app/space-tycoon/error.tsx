'use client';

export default function SpaceTycoonError({ reset }: { reset: () => void }) {
  const handleClearSave = () => {
    try {
      localStorage.removeItem('spacetycoon_save');
      localStorage.removeItem('spacetycoon_daily_bonus');
      localStorage.removeItem('spacetycoon_sound');
    } catch { /* ignore */ }
    reset();
  };

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <span className="text-5xl block mb-4">🚀💥</span>
        <h2 className="text-xl font-bold text-white mb-2">Mission Failure</h2>
        <p className="text-slate-400 text-sm mb-6">
          Something went wrong with the simulation. This can happen when the game updates and your old save is incompatible.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleClearSave}
            className="w-full py-3 text-sm font-semibold text-white border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 rounded-xl transition-colors"
          >
            Clear Save &amp; Start Fresh
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-4">
          If the error persists after clearing your save, please report it.
        </p>
      </div>
    </div>
  );
}
