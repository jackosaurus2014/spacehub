import type { Metadata } from 'next';
import { Suspense } from 'react';
import SaveLandingClient from './SaveLandingClient';

// Target of the "Save" links in the digest emails. Never indexed: it is a
// per-visitor action URL, not content.
export const metadata: Metadata = {
  title: 'Save to reading list',
  description: 'Add an article to your SpaceNexus reading list.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://spacenexus.us/reading-list' },
};

export default function SaveToReadingListPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black" />}>
      <SaveLandingClient />
    </Suspense>
  );
}
