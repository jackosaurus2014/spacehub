'use client';

interface ProgressBarProps {
  /** Current progress value (0-100) */
  value: number;
  /** Optional label displayed above the bar */
  label?: string;
  /** Whether to display the percentage text */
  showPercentage?: boolean;
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning';
  /** When true, shows an animated shimmer instead of a fixed value */
  indeterminate?: boolean;
  /** Height size of the bar */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const variantGradients: Record<'default' | 'success' | 'warning', string> = {
  default: 'from-nebula-500 via-plasma-400 to-plasma-300',
  success: 'from-emerald-600 via-emerald-500 to-emerald-400',
  warning: 'from-amber-600 via-amber-500 to-rocket-400',
};

const variantGlows: Record<'default' | 'success' | 'warning', string> = {
  default: '0 0 8px rgba(6, 182, 212, 0.4), 0 0 16px rgba(139, 92, 246, 0.2)',
  success: '0 0 8px rgba(16, 185, 129, 0.4), 0 0 16px rgba(16, 185, 129, 0.2)',
  warning: '0 0 8px rgba(245, 158, 11, 0.4), 0 0 16px rgba(249, 115, 22, 0.2)',
};

export default function ProgressBar({
  value,
  label,
  showPercentage = false,
  variant = 'default',
  indeterminate = false,
  size = 'md',
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const heightClass = sizeClasses[size];
  const gradientClass = variantGradients[variant];
  const glowStyle = variantGlows[variant];

  return (
    <div className="w-full">
      {/* Label and percentage row */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-star-200 truncate mr-2">
              {label}
            </span>
          )}
          {showPercentage && !indeterminate && (
            <span className="text-xs font-mono text-star-300 tabular-nums flex-shrink-0">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className={`w-full ${heightClass} rounded-full bg-slate-800 border border-white/[0.06] overflow-hidden`}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || (indeterminate ? 'Loading' : `Progress: ${Math.round(clampedValue)}%`)}
      >
        {indeterminate ? (
          /* Indeterminate shimmer animation */
          <div
            className={`h-full w-full rounded-full bg-gradient-to-r ${gradientClass} animate-progress-shimmer`}
            style={{
              backgroundSize: '200% 100%',
            }}
          />
        ) : (
          /* Determinate fill */
          <div
            className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out`}
            style={{
              width: `${clampedValue}%`,
              boxShadow: clampedValue > 0 ? glowStyle : 'none',
            }}
          />
        )}
      </div>
    </div>
  );
}
