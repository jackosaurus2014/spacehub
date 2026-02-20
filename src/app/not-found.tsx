import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-slate-500 to-slate-700 mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Try searching or browse our modules below.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Link
            href="/"
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/search"
            className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
          >
            Search
          </Link>
        </div>
        <div className="border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">Popular Pages</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { href: '/mission-control', label: 'Mission Control' },
              { href: '/news', label: 'News' },
              { href: '/market-intel', label: 'Market Intel' },
              { href: '/marketplace', label: 'Marketplace' },
              { href: '/investors', label: 'Investor Hub' },
              { href: '/satellites', label: 'Satellites' },
              { href: '/company-profiles', label: 'Companies' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 rounded-full transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
