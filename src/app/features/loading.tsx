import { Skeleton } from '@/components/ui/Skeleton';

export default function FeaturesLoading() {
  return (
    <div className="min-h-screen bg-[#050a15]">
      <div className="container mx-auto px-4 py-12">
        {/* Hero skeleton */}
        <div className="text-center mb-16">
          <Skeleton className="h-10 w-96 max-w-full mx-auto mb-4" />
          <Skeleton className="h-5 w-64 mx-auto" />
        </div>

        {/* Category sections skeleton */}
        {Array.from({ length: 5 }).map((_, sectionIdx) => (
          <div key={sectionIdx} className="mb-16">
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-80 max-w-full mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="p-5 rounded-xl border border-slate-700/50 bg-slate-800/30"
                >
                  <Skeleton className="h-8 w-8 rounded-lg mb-3" />
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Comparison table skeleton */}
        <div className="mb-16">
          <Skeleton className="h-7 w-64 mx-auto mb-8" />
          <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`flex gap-4 p-4 ${i === 0 ? 'bg-slate-800/50' : ''} border-b border-slate-700/30`}
              >
                <Skeleton className="h-4 w-40 flex-shrink-0" />
                <Skeleton className="h-4 w-24 flex-1" />
                <Skeleton className="h-4 w-24 flex-1" />
                <Skeleton className="h-4 w-24 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* CTA skeleton */}
        <div className="text-center">
          <Skeleton className="h-8 w-80 max-w-full mx-auto mb-4" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-12 w-36 rounded-lg" />
            <Skeleton className="h-12 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
