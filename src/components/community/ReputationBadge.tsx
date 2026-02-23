'use client';

const REPUTATION_LEVELS = [
  { min: 0, label: 'Novice', color: 'text-gray-400', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/20', badge: '\u{1F311}' },
  { min: 50, label: 'Contributor', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', badge: '\u{1F312}' },
  { min: 200, label: 'Active Member', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', badge: '\u{1F313}' },
  { min: 500, label: 'Expert', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', badge: '\u{1F314}' },
  { min: 1000, label: 'Trusted', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20', badge: '\u{1F315}' },
  { min: 2500, label: 'Space Authority', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', badge: '\u2B50' },
];

function getLevel(reputation: number) {
  let current = REPUTATION_LEVELS[0];
  let nextLevel: typeof REPUTATION_LEVELS[0] | undefined;

  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (reputation >= REPUTATION_LEVELS[i].min) {
      current = REPUTATION_LEVELS[i];
      nextLevel = REPUTATION_LEVELS[i + 1];
      break;
    }
  }

  return { current, nextLevel };
}

interface ReputationBadgeProps {
  reputation: number;
  size?: 'sm' | 'md';
}

export default function ReputationBadge({ reputation, size = 'sm' }: ReputationBadgeProps) {
  const { current, nextLevel } = getLevel(reputation);

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${current.bgColor} ${current.color} border ${current.borderColor} font-medium`}
        title={`${current.label} - ${reputation} reputation`}
      >
        <span>{current.badge}</span>
        <span>{current.label}</span>
      </span>
    );
  }

  // Medium size: badge + level name + score + progress bar to next level
  const progressPercent = nextLevel
    ? Math.min(
        100,
        ((reputation - current.min) / (nextLevel.min - current.min)) * 100
      )
    : 100;

  return (
    <div
      className={`inline-flex flex-col gap-1 px-2.5 py-1.5 rounded-lg ${current.bgColor} border ${current.borderColor}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{current.badge}</span>
        <span className={`text-xs font-semibold ${current.color}`}>
          {current.label}
        </span>
        <span className="text-[10px] text-slate-500 ml-auto">
          {reputation} rep
        </span>
      </div>
      {nextLevel && (
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                current.color.includes('gray')
                  ? 'bg-gray-400'
                  : current.color.includes('blue')
                  ? 'bg-blue-400'
                  : current.color.includes('green')
                  ? 'bg-green-400'
                  : current.color.includes('purple')
                  ? 'bg-purple-400'
                  : current.color.includes('yellow')
                  ? 'bg-yellow-400'
                  : 'bg-amber-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[9px] text-slate-600 whitespace-nowrap">
            {nextLevel.min - reputation} to {nextLevel.label}
          </span>
        </div>
      )}
      {!nextLevel && (
        <div className="text-[9px] text-slate-500">Max level reached</div>
      )}
    </div>
  );
}
