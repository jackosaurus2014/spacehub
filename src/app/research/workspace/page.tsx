import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RESEARCH_PLAN, resolveResearchAccess } from '@/lib/research';
import { RESEARCH_DATASETS, RESEARCH_DATASET_IDS } from '@/lib/research-export';
import WorkspaceClient from './WorkspaceClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Research workspace',
  description: 'Exports, portfolio exposure, screens and the quarterly sector report.',
  robots: { index: false, follow: false },
};

/**
 * The gated workspace.
 *
 * Authorization happens HERE, on the server, with the same resolveResearchAccess
 * the API routes use — and again inside every API call the client makes. The
 * client is never the gate; if this page were somehow rendered for a
 * non-subscriber, every button on it would still return 403.
 */
export default async function ResearchWorkspacePage() {
  const session = await getServerSession(authOptions);
  const result = await resolveResearchAccess(session?.user?.id);

  if (!result.ok) {
    return (
      <div className="min-h-screen bg-slate-950">
        <main className="max-w-xl mx-auto px-4 py-20">
          <h1 className="text-2xl font-bold text-white mb-3">SpaceNexus Research</h1>
          <p className="text-slate-300 mb-6">
            {result.reason === 'not-signed-in'
              ? 'Sign in with your SpaceNexus Research account to open the workspace.'
              : result.reason === 'subscription-not-active'
                ? 'The Research subscription behind this account is not active right now.'
                : result.reason === 'seat-over-cap'
                  ? 'Your seat is outside the number of seats this subscription currently covers. The account owner can free a seat or add more.'
                  : 'The Research workspace is part of the SpaceNexus Research plan. Everything you have on the free and Professional plans is unchanged.'}
          </p>
          <Link
            href="/research"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-cyan-500 px-5 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            About SpaceNexus Research
          </Link>
        </main>
      </div>
    );
  }

  const isOwner = result.access.via === 'owner' || result.access.via === 'test';

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Research workspace</h1>
          <p className="text-sm text-slate-400 mt-2">
            {isOwner
              ? `You own this subscription — ${result.access.seatsTotal} named seats, you included.`
              : 'You are on a seat of this subscription. Seat administration and billing stay with the account that pays.'}
          </p>
        </header>

        <WorkspaceClient
          isOwner={isOwner}
          seatsTotal={result.access.seatsTotal}
          totalSeatsAdvertised={RESEARCH_PLAN.totalSeats}
          datasets={RESEARCH_DATASET_IDS.map((id) => ({
            id,
            label: RESEARCH_DATASETS[id].label,
            coverage: RESEARCH_DATASETS[id].coverage,
          }))}
        />
      </main>
    </div>
  );
}
