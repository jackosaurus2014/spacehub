export default function NewsletterLoading() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 pt-16 pb-12">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge skeleton */}
          <div className="flex justify-center mb-6">
            <div className="h-8 w-48 bg-white/[0.06] rounded-full animate-pulse" />
          </div>

          {/* Title skeleton */}
          <div className="space-y-3 mb-8">
            <div className="h-12 w-3/4 bg-white/[0.06] rounded-lg animate-pulse mx-auto" />
            <div className="h-12 w-1/2 bg-white/[0.06] rounded-lg animate-pulse mx-auto" />
          </div>

          {/* Description skeleton */}
          <div className="h-6 w-2/3 bg-white/[0.06] rounded-lg animate-pulse mx-auto mb-8" />

          {/* Form skeleton */}
          <div className="max-w-xl mx-auto flex gap-3">
            <div className="flex-1 h-14 bg-white/[0.06] rounded-xl animate-pulse" />
            <div className="w-40 h-14 bg-white/[0.06] rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeletons */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6">
                <div className="w-10 h-10 bg-white/[0.06] rounded-lg animate-pulse mb-4" />
                <div className="h-5 w-1/3 bg-white/[0.06] rounded animate-pulse mb-3" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/[0.06] rounded animate-pulse" />
                  <div className="h-3 w-4/5 bg-white/[0.06] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
