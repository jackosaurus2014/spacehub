export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Title skeleton */}
        <div className="text-center mb-8">
          <div className="h-8 w-40 sm:w-56 bg-slate-800 rounded-lg animate-pulse mx-auto mb-3" />
          <div className="h-4 w-64 sm:w-80 bg-slate-800/60 rounded animate-pulse mx-auto" />
        </div>

        {/* Contact form skeleton */}
        <div className="bg-slate-800/50 rounded-xl p-5 sm:p-8 animate-pulse">
          <div className="space-y-5">
            {/* Name field */}
            <div>
              <div className="h-3 w-16 bg-slate-700/50 rounded mb-2" />
              <div className="h-11 w-full bg-slate-700/30 rounded-lg" />
            </div>

            {/* Email field */}
            <div>
              <div className="h-3 w-20 bg-slate-700/50 rounded mb-2" />
              <div className="h-11 w-full bg-slate-700/30 rounded-lg" />
            </div>

            {/* Subject field */}
            <div>
              <div className="h-3 w-20 bg-slate-700/50 rounded mb-2" />
              <div className="h-11 w-full bg-slate-700/30 rounded-lg" />
            </div>

            {/* Message field */}
            <div>
              <div className="h-3 w-24 bg-slate-700/50 rounded mb-2" />
              <div className="h-32 w-full bg-slate-700/30 rounded-lg" />
            </div>

            {/* Submit button */}
            <div className="h-12 w-full sm:w-40 bg-slate-700/50 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
