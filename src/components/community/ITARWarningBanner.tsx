import Link from 'next/link';

export default function ITARWarningBanner() {
  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h4 className="text-sm font-semibold text-amber-800 mb-1">Export Control Notice</h4>
          <p className="text-xs text-amber-700 leading-relaxed">
            Do not share ITAR-controlled technical data (22 CFR 120-130) or EAR-restricted information
            (15 CFR 730-774) in these forums. Violations of U.S. export control laws carry penalties up
            to $1,000,000 per violation and 20 years imprisonment.{' '}
            <Link href="/community/guidelines" className="underline hover:text-amber-900 font-medium">
              Read our Community Guidelines
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
