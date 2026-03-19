export default function VsLoading() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6 max-w-5xl mx-auto">
          <div className="h-10 w-48 bg-white/[0.06] rounded-lg" />
          <div className="h-64 bg-white/[0.06] rounded-xl" />
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white/[0.06] rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
