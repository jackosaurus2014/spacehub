'use client';

import Link from 'next/link';

export default function HeroActions() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link href="/mission-control" className="btn-primary text-base py-4 px-10">
        Mission Control
      </Link>
      <Link href="/news" className="btn-secondary text-base py-4 px-10">
        Explore News
      </Link>
    </div>
  );
}
