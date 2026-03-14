export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="animate-pulse space-y-6">
          {/* Title */}
          <div className="h-10 w-3/4 bg-white/[0.06] rounded" />
          {/* Subtitle */}
          <div className="h-5 w-1/2 bg-white/[0.05] rounded" />
          {/* Meta row */}
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-white/[0.04] rounded" />
            <div className="h-4 w-32 bg-white/[0.04] rounded" />
          </div>
          {/* Article body */}
          <div className="space-y-3 pt-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-4 bg-white/[0.04] rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
