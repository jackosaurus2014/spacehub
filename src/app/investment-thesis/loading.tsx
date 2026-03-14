export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-8 w-72 bg-white/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-white/[0.05] rounded animate-pulse" />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Form skeleton */}
          <div className="bg-white/[0.04] rounded-xl p-6 mb-6 animate-pulse">
            <div className="h-6 w-48 bg-slate-700/50 rounded mb-6" />
            <div className="space-y-4">
              <div>
                <div className="h-4 w-32 bg-slate-700/50 rounded mb-2" />
                <div className="h-12 bg-slate-700/50 rounded" />
              </div>
              <div>
                <div className="h-4 w-32 bg-slate-700/50 rounded mb-2" />
                <div className="h-12 bg-slate-700/50 rounded" />
              </div>
              <div>
                <div className="h-4 w-32 bg-slate-700/50 rounded mb-2" />
                <div className="h-32 bg-slate-700/50 rounded" />
              </div>
              <div className="h-12 w-full bg-slate-700/50 rounded" />
            </div>
          </div>

          {/* Output skeleton */}
          <div className="bg-white/[0.04] rounded-xl p-6 animate-pulse">
            <div className="h-6 w-40 bg-slate-700/50 rounded mb-6" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/50 rounded" />
              <div className="h-4 w-5/6 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/50 rounded" />
              <div className="h-4 w-4/5 bg-slate-700/50 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
