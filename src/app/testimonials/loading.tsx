export default function TestimonialsLoading() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
          <div className="h-10 w-48 bg-white/[0.06] rounded-lg" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/[0.06] rounded-xl" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
