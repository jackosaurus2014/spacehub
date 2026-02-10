'use client';

interface RatingDistributionProps {
  reviews: { overallRating: number; qualityRating?: number | null; timelineRating?: number | null; commRating?: number | null; valueRating?: number | null }[];
  avgRating: number | null;
}

export default function RatingDistribution({ reviews, avgRating }: RatingDistributionProps) {
  if (reviews.length === 0) return null;

  // Calculate star distribution
  const distribution = [0, 0, 0, 0, 0]; // 1-5 stars
  for (const r of reviews) {
    if (r.overallRating >= 1 && r.overallRating <= 5) {
      distribution[r.overallRating - 1]++;
    }
  }
  const maxCount = Math.max(...distribution, 1);

  // Calculate sub-rating averages
  const subRatings = [
    { label: 'Quality', key: 'qualityRating' as const },
    { label: 'Timeline', key: 'timelineRating' as const },
    { label: 'Communication', key: 'commRating' as const },
    { label: 'Value', key: 'valueRating' as const },
  ].map((sub) => {
    const rated = reviews.filter((r) => r[sub.key]);
    const avg = rated.length > 0
      ? rated.reduce((s, r) => s + (r[sub.key] || 0), 0) / rated.length
      : null;
    return { ...sub, avg, count: rated.length };
  });

  return (
    <div className="card p-5">
      <div className="flex items-start gap-6">
        {/* Overall Score */}
        <div className="text-center flex-shrink-0">
          <div className="text-4xl font-bold text-white">{avgRating?.toFixed(1) || '-'}</div>
          <div className="flex justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-sm ${star <= Math.round(avgRating || 0) ? 'text-yellow-400' : 'text-slate-600'}`}
              >
                ★
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-500 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Star Distribution Bars */}
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1];
            const pct = (count / maxCount) * 100;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-3 text-right">{star}</span>
                <span className="text-xs text-yellow-400">★</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-rating Averages */}
      {subRatings.some((s) => s.avg !== null) && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {subRatings.map((sub) => sub.avg !== null && (
            <div key={sub.key} className="text-center">
              <div className="text-[10px] text-slate-500 uppercase">{sub.label}</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-sm text-yellow-400">★</span>
                <span className="text-sm font-semibold text-white">{sub.avg.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
