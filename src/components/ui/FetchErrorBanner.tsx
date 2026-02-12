'use client';

interface FetchErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export default function FetchErrorBanner({
  message = 'Failed to load data. Please try again.',
  onRetry,
}: FetchErrorBannerProps) {
  return (
    <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center">
      <div className="text-red-400 text-sm font-medium mb-2">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-red-300 hover:text-red-200 underline transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
