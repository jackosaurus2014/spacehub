export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-52 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form area */}
          <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-6">
            <div className="h-6 w-40 bg-slate-700/50 rounded" />
            {/* Form fields */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-28 bg-slate-700/30 rounded" />
                <div className="h-10 w-full bg-slate-700/20 rounded-lg" />
              </div>
            ))}
            {/* Slider */}
            <div className="space-y-2">
              <div className="h-4 w-32 bg-slate-700/30 rounded" />
              <div className="h-2 w-full bg-slate-700/20 rounded-full" />
            </div>
            {/* Submit button */}
            <div className="h-11 w-full bg-slate-700/30 rounded-lg" />
          </div>

          {/* Preview area */}
          <div className="space-y-6">
            {/* Mission summary card */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-44 bg-slate-700/50 rounded" />
              <div className="h-48 w-full bg-slate-700/30 rounded-lg" />
            </div>
            {/* Timeline card */}
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-6 w-36 bg-slate-700/50 rounded" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-3 bg-orange-500/30 rounded-full flex-shrink-0" />
                  <div className="h-4 w-full bg-slate-700/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
