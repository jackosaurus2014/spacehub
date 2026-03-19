export default function AppDownloadLoading() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
          <div className="h-10 w-48 bg-white/[0.06] rounded-lg" />
          <div className="h-5 w-80 bg-white/[0.04] rounded" />
          <div className="h-64 bg-white/[0.06] rounded-xl" />
          <div className="h-48 bg-white/[0.06] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
