import GameIcon from '@/components/game/GameIcon';

export default function SpaceTycoonLoading() {
  return (
    <div className="min-h-screen bg-space-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center"><GameIcon name="fleet" size={40} glow="cyan" /></div>
        <p className="text-white font-semibold">Loading Space Tycoon...</p>
        <p className="text-slate-500 text-sm mt-1">Initializing solar system</p>
      </div>
    </div>
  );
}
