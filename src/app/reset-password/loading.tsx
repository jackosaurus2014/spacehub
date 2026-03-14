export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-white/[0.06] rounded mx-auto" />
          <div className="space-y-3">
            <div className="h-10 bg-white/[0.06] rounded" />
            <div className="h-10 bg-white/[0.06] rounded" />
            <div className="h-10 bg-white/[0.06] rounded" />
          </div>
          <div className="h-10 bg-white/[0.06] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
