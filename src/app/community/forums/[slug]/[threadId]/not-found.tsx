import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">&#x2604;&#xFE0F;</div>
        <h1 className="text-2xl font-bold text-white mb-2">Thread Not Found</h1>
        <p className="text-slate-400 mb-6">
          The forum thread you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/community"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Browse Forums
        </Link>
      </div>
    </div>
  );
}
