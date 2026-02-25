'use client';

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low';
  showLabel?: boolean;
}

export default function ConfidenceBadge({ level, showLabel = true }: ConfidenceBadgeProps) {
  const config = {
    high: { color: 'emerald' as const, label: 'High Confidence', icon: '\u25CF\u25CF\u25CF', description: 'Based on verified data sources' },
    medium: { color: 'amber' as const, label: 'Medium Confidence', icon: '\u25CF\u25CF\u25CB', description: 'Based on available data with some gaps' },
    low: { color: 'red' as const, label: 'Low Confidence', icon: '\u25CF\u25CB\u25CB', description: 'Limited data — use as directional guidance only' },
  };

  const { color, label, icon, description } = config[level];
  const colorClasses = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${colorClasses[color]}`}
      title={description}
      role="status"
      aria-label={`${label}: ${description}`}
    >
      <span className="text-[10px]" aria-hidden="true">{icon}</span>
      {showLabel && <span>{label}</span>}
    </div>
  );
}
