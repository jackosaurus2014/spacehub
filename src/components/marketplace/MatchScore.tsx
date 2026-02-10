'use client';

interface MatchScoreProps {
  score: number;
  reasons?: Record<string, number>;
  showDetails?: boolean;
}

export default function MatchScore({ score, reasons, showDetails = false }: MatchScoreProps) {
  const getColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-cyan-400';
    if (s >= 40) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getBgColor = (s: number) => {
    if (s >= 80) return 'bg-green-500';
    if (s >= 60) return 'bg-cyan-500';
    if (s >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getBgColor(score)}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <span className={`text-sm font-bold ${getColor(score)}`}>{score}%</span>
      </div>
      {showDetails && reasons && (
        <div className="space-y-0.5 text-[10px] text-slate-500">
          {Object.entries(reasons).map(([key, val]) => (
            <div key={key} className="flex justify-between">
              <span className="capitalize">{key}</span>
              <span className="text-slate-400">+{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
