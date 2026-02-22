export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="h-4 w-52 bg-slate-800/40 rounded animate-pulse mb-6" />

        {/* Listing hero */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-6 mb-8">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 bg-slate-700/50 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-7 w-72 bg-slate-700/50 rounded" />
              <div className="h-4 w-48 bg-slate-700/30 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-24 bg-blue-500/20 rounded-full" />
                <div className="h-6 w-20 bg-green-500/20 rounded-full" />
              </div>
            </div>
            <div className="hidden md:block space-y-2 text-right">
              <div className="h-6 w-32 bg-slate-700/50 rounded" />
              <div className="h-4 w-24 bg-slate-700/30 rounded ml-auto" />
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-32 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
            </div>
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-5 w-28 bg-slate-700/50 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-4/5 bg-slate-700/30 rounded" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-xl animate-pulse p-5 space-y-3">
              <div className="h-10 w-full bg-blue-500/20 rounded-lg" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
