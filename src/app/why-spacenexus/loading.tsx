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

        {/* Feature cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/[0.04] rounded-lg" />
                <div className="h-5 w-2/3 bg-white/[0.04] rounded" />
              </div>
              <div className="h-3 w-full bg-white/[0.03] rounded" />
              <div className="h-3 w-3/4 bg-white/[0.03] rounded" />
            </div>
          ))}
        </div>

        {/* Testimonials skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white/[0.04] rounded-xl animate-pulse p-6 space-y-3">
              <div className="h-4 w-full bg-white/[0.03] rounded" />
              <div className="h-4 w-5/6 bg-white/[0.03] rounded" />
              <div className="h-3 w-1/3 bg-white/[0.04] rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
