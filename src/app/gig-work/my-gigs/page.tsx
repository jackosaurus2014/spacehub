import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My gigs | SpaceNexus',
  description: 'Gigs you have posted and gigs you have applied to.',
};

const CATEGORY_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  operations: 'Operations',
  business: 'Business',
  research: 'Research',
  legal: 'Legal',
  manufacturing: 'Manufacturing',
};

function formatBudget(
  min: number | null,
  max: number | null,
  type: string
): string {
  if (min == null && max == null) return 'Negotiable';
  const suffix = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : '';
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${suffix}`;
  if (min != null) return `From ${fmt(min)}${suffix}`;
  if (max != null) return `Up to ${fmt(max)}${suffix}`;
  return 'Negotiable';
}

export default async function MyGigsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/gig-work/my-gigs');
  }

  const userId = session.user.id;

  let postedGigs: Awaited<ReturnType<typeof prisma.gigOpportunity.findMany>> = [];
  let appliedApplications: Awaited<
    ReturnType<typeof prisma.activityLog.findMany>
  > = [];

  try {
    const employer = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const [gigs, applications] = await Promise.all([
      employer
        ? prisma.gigOpportunity.findMany({
            where: { employerId: employer.id },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      prisma.activityLog.findMany({
        where: {
          userId,
          event: 'gig_application',
          module: 'gig-work',
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    postedGigs = gigs;
    appliedApplications = applications;
  } catch (error) {
    logger.error('Failed to load my gigs', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Resolve gigIds from applications and hydrate the gig summaries.
  const appliedGigIds = Array.from(
    new Set(
      appliedApplications
        .map((a) => {
          const meta = (a.metadata as { gigId?: string } | null) || null;
          return meta?.gigId || null;
        })
        .filter((id): id is string => Boolean(id))
    )
  );

  const appliedGigs = appliedGigIds.length
    ? await prisma.gigOpportunity.findMany({
        where: { id: { in: appliedGigIds } },
        include: {
          employer: { select: { companyName: true, verified: true } },
        },
      })
    : [];

  const appliedGigById = new Map(appliedGigs.map((g) => [g.id, g]));

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-3xl font-bold">My gigs</h1>
            <p className="text-slate-400 mt-2">
              Manage gigs you&apos;ve posted and track gigs you&apos;ve applied to.
            </p>
          </div>
          <Link
            href="/gig-work/post"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
          >
            Post a gig
          </Link>
        </div>

        <section className="mt-4">
          <h2 className="text-xl font-semibold mb-3">Posted by you</h2>
          {postedGigs.length === 0 ? (
            <div className="rounded-xl border border-white/20 bg-white/5 p-6 text-sm text-slate-400">
              You haven&apos;t posted any gigs yet.{' '}
              <Link href="/gig-work/post" className="underline hover:text-white">
                Post your first gig
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {postedGigs.map((gig) => (
                <Link
                  key={gig.id}
                  href={`/gig-work/${gig.id}`}
                  className="rounded-xl border border-white/20 bg-white/5 p-4 hover:border-white/40 hover:bg-white/[0.07] transition-colors block"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold">{gig.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        gig.isActive
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {gig.isActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex flex-wrap gap-3">
                    <span>{CATEGORY_LABELS[gig.category] || gig.category}</span>
                    <span>
                      {formatBudget(gig.budgetMin, gig.budgetMax, gig.budgetType)}
                    </span>
                    <span>{gig.applicantCount} applicant{gig.applicantCount === 1 ? '' : 's'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-3">You&apos;ve applied to</h2>
          {appliedApplications.length === 0 ? (
            <div className="rounded-xl border border-white/20 bg-white/5 p-6 text-sm text-slate-400">
              You haven&apos;t applied to any gigs yet.{' '}
              <Link href="/gig-work" className="underline hover:text-white">
                Browse open gigs
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {appliedApplications.map((app) => {
                const meta =
                  (app.metadata as { gigId?: string } | null) || null;
                const gig = meta?.gigId
                  ? appliedGigById.get(meta.gigId)
                  : undefined;
                if (!gig) {
                  return (
                    <div
                      key={app.id}
                      className="rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-slate-400"
                    >
                      Gig no longer available.
                    </div>
                  );
                }
                return (
                  <Link
                    key={app.id}
                    href={`/gig-work/${gig.id}`}
                    className="rounded-xl border border-white/20 bg-white/5 p-4 hover:border-white/40 hover:bg-white/[0.07] transition-colors block"
                  >
                    <h3 className="font-semibold">{gig.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {gig.employer?.companyName || 'Independent'}
                    </p>
                    <div className="mt-2 text-xs text-slate-400 flex flex-wrap gap-3">
                      <span>{CATEGORY_LABELS[gig.category] || gig.category}</span>
                      <span>
                        {formatBudget(gig.budgetMin, gig.budgetMax, gig.budgetType)}
                      </span>
                      <span>
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
