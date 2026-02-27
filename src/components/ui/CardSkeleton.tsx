export default function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-5 bg-slate-700/50 rounded w-3/4 mb-4"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-700/30 rounded w-full mb-2"></div>
      ))}
      <div className="h-3 bg-slate-700/30 rounded w-1/2 mt-4"></div>
    </div>
  );
}
