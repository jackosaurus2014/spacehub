import type { Metadata } from 'next';
import AcceptSeatClient from './AcceptSeatClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Accept your SpaceNexus Research seat',
  description: 'Accept an invitation to a SpaceNexus Research subscription.',
  robots: { index: false, follow: false },
};

/**
 * Landing page for a seat invite link. It does nothing on its own: the token is
 * posted to /api/research/seats/accept, which is where every check actually
 * happens (signed in, email matches, email verified, invite live, owner still
 * paying). This page is a button, not a gate.
 */
export default async function AcceptSeatPage(props: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await props.searchParams;
  return (
    <div className="min-h-screen bg-slate-950">
      <main className="max-w-lg mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-white mb-3">
          Accept your SpaceNexus Research seat
        </h1>
        <AcceptSeatClient token={token ?? ''} />
      </main>
    </div>
  );
}
