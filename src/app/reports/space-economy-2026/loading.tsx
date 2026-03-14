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

        {/* Stats bar skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>

        {/* Report sections skeleton */}
        <div className="space-y-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 space-y-3">
              <div className="h-6 w-1/3 bg-white/[0.04] rounded" />
              <div className="h-3 w-full bg-white/[0.03] rounded" />
              <div className="h-3 w-5/6 bg-white/[0.03] rounded" />
              <div className="h-3 w-4/5 bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
