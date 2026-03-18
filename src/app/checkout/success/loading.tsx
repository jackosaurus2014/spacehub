export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center animate-pulse">
        {/* Checkmark circle skeleton */}
        <div className="w-20 h-20 bg-white/[0.06] rounded-full mx-auto mb-6" />
        <div className="h-8 w-64 bg-white/[0.06] rounded-lg mx-auto mb-3" />
        <div className="h-4 w-80 max-w-full bg-white/[0.05] rounded mx-auto mb-2" />
        <div className="h-4 w-56 bg-white/[0.04] rounded mx-auto mb-8" />
        <div className="h-12 w-48 bg-white/[0.04] rounded-lg mx-auto" />
      </div>
    </div>
  );
}
