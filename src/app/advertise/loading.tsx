export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-52 bg-slate-800 rounded animate-pulse mb-3" />
          <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
        </div>
        {/* Hero content block */}
        <div className="bg-slate-800/40 rounded-xl animate-pulse p-8 mb-8 space-y-4">
          <div className="h-6 w-3/4 bg-slate-700/40 rounded" />
          <div className="h-4 w-full bg-slate-700/30 rounded" />
          <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
        </div>
        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-slate-800/40 rounded-xl animate-pulse p-6 space-y-4">
              <div className="h-5 w-28 bg-slate-700/40 rounded" />
              <div className="h-8 w-20 bg-white/10 rounded" />
              <div className="h-4 w-full bg-slate-700/30 rounded" />
              <div className="h-4 w-3/4 bg-slate-700/30 rounded" />
              <div className="h-10 w-full bg-slate-700/40 rounded-lg mt-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
