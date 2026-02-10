'use client';

interface Review {
  id: string;
  overallRating: number;
  qualityRating: number | null;
  timelineRating: number | null;
  commRating: number | null;
  valueRating: number | null;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  providerResponse: string | null;
  providerRespondedAt: string | null;
  createdAt: string;
}

interface ReviewCardProps {
  review: Review;
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`text-xs ${i < rating ? 'text-yellow-400' : 'text-slate-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={review.overallRating} />
          {review.isVerified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-bold">
              Verified Purchase
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>

      {review.title && (
        <h4 className="text-sm font-semibold text-white">{review.title}</h4>
      )}

      {review.content && (
        <p className="text-xs text-slate-400 leading-relaxed">{review.content}</p>
      )}

      {/* Sub-ratings */}
      {(review.qualityRating || review.timelineRating || review.commRating || review.valueRating) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-700/50">
          {review.qualityRating && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              Quality <StarRating rating={review.qualityRating} />
            </div>
          )}
          {review.timelineRating && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              Timeline <StarRating rating={review.timelineRating} />
            </div>
          )}
          {review.commRating && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              Comms <StarRating rating={review.commRating} />
            </div>
          )}
          {review.valueRating && (
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              Value <StarRating rating={review.valueRating} />
            </div>
          )}
        </div>
      )}

      {/* Provider Response */}
      {review.providerResponse && (
        <div className="bg-slate-800/50 rounded-lg p-3 ml-4 border-l-2 border-cyan-500/30">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-cyan-400">Provider Response</span>
            {review.providerRespondedAt && (
              <span className="text-[10px] text-slate-600">
                {new Date(review.providerRespondedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{review.providerResponse}</p>
        </div>
      )}
    </div>
  );
}
