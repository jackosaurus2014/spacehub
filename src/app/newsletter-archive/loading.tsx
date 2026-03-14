export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Hero section skeleton */}
        <div className="animate-pulse text-center py-16 mb-12">
          <div className="h-10 w-80 bg-white/[0.06] rounded-lg mx-auto mb-4" />
          <div className="h-5 w-[32rem] max-w-full bg-white/[0.05] rounded mx-auto mb-6" />
          <div className="h-12 w-48 bg-white/30 rounded-xl mx-auto" />
        </div>

        {/* Filter bar skeleton */}
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Newsletter list skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-white/[0.04] rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 bg-white/[0.04] rounded" />
                <div className="h-3 w-full bg-white/[0.03] rounded" />
              </div>
              <div className="h-4 w-20 bg-white/[0.03] rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
