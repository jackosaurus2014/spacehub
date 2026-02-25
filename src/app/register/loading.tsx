export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-slate-800 rounded mx-auto" />
          <div className="space-y-3">
            <div className="h-10 bg-slate-800 rounded" />
            <div className="h-10 bg-slate-800 rounded" />
            <div className="h-10 bg-slate-800 rounded" />
          </div>
          <div className="h-10 bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
