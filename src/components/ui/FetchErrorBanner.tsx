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
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-300 hover:text-white bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg px-4 py-2 min-h-[44px] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
}
