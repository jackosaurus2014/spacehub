import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import ApplyGigPanel from './ApplyGigPanel';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  engineering: 'Engineering',
  operations: 'Operations',
  business: 'Business',
  research: 'Research',
  legal: 'Legal',
  manufacturing: 'Manufacturing',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  freelance: 'Freelance',
  contract: 'Contract',
  part_time: 'Part-time',
  consulting: 'Consulting',
  side_project: 'Side project',
};

const BUDGET_TYPE_SUFFIX: Record<string, string> = {
  hourly: '/hr',
  monthly: '/mo',
  fixed: '',
};

function formatBudget(
  min: number | null,
  max: number | null,
  type: string
): string {
  const suffix = BUDGET_TYPE_SUFFIX[type] ?? '';
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (min == null && max == null) return 'Negotiable';
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${suffix}`;
  if (min != null) return `From ${fmt(min)}${suffix}`;
  if (max != null) return `Up to ${fmt(max)}${suffix}`;
  return 'Negotiable';
}

async function fetchGig(id: string) {
  try {
    return await prisma.gigOpportunity.findUnique({
      where: { id },
      include: {
        employer: {
          select: {
            id: true,
            userId: true,
            companyName: true,
            companySlug: true,
            description: true,
            website: true,
            industry: true,
            size: true,
            location: true,
            logoUrl: true,
            verified: true,
          },
        },
      },
    });
  } catch (error) {
    logger.error('Failed to load gig detail', {
      gigId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const gig = await fetchGig(params.id);
  if (!gig) return { title: 'Gig not found | SpaceNexus' };
  return {
    title: `${gig.title} | Gig Work | SpaceNexus`,
    description: gig.description.slice(0, 160),
  };
}

export default async function GigDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const gig = await fetchGig(params.id);
  if (!gig) notFound();

  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === gig.employer.userId;

  let hasApplied = false;
  if (session?.user?.id && !isOwner) {
    const existing = await prisma.activityLog.findFirst({
      where: {
        userId: session.user.id,
        event: 'gig_application',
        module: 'gig-work',
        metadata: { path: ['gigId'], equals: gig.id },
      },
      select: { id: true },
    });
    hasApplied = Boolean(existing);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/gig-work"
          className="text-sm text-slate-400 hover:text-white"
        >
          &larr; Back to gig board
        </Link>

        <div className="mt-6 rounded-xl border border-white/20 bg-white/5 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{gig.title}</h1>
              <p className="text-slate-400 mt-1">
                {gig.employer.companyName}
                {gig.employer.verified && (
                  <span className="ml-2 text-xs text-emerald-400">verified</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {gig.remoteOk && (
                <span className="rounded bg-white/10 px-2 py-1 text-xs text-white/90">
                  Remote OK
                </span>
              )}
              {gig.clearanceRequired && (
                <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-300">
                  Clearance required
                </span>
              )}
              {!gig.isActive && (
                <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-300">
                  Closed
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400">Category</div>
              <div className="mt-1">
                {CATEGORY_LABELS[gig.category] || gig.category}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Work type</div>
              <div className="mt-1">
                {WORK_TYPE_LABELS[gig.workType] || gig.workType}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Budget</div>
              <div className="mt-1">
                {formatBudget(gig.budgetMin, gig.budgetMax, gig.budgetType)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Duration</div>
              <div className="mt-1">{gig.duration || 'Flexible'}</div>
            </div>
            {gig.hoursPerWeek != null && (
              <div>
                <div className="text-xs text-slate-400">Hours / week</div>
                <div className="mt-1">{gig.hoursPerWeek}</div>
              </div>
            )}
            {gig.location && (
              <div>
                <div className="text-xs text-slate-400">Location</div>
                <div className="mt-1">{gig.location}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-400">Applicants</div>
              <div className="mt-1">{gig.applicantCount}</div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
              {gig.description}
            </p>
          </div>

          {gig.skills.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Required skills</h2>
              <div className="flex flex-wrap gap-2">
                {gig.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white/90"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-white/20 bg-white/5 p-6">
          <ApplyGigPanel
            gigId={gig.id}
            isActive={gig.isActive}
            isOwner={isOwner}
            isAuthenticated={Boolean(session?.user?.id)}
            hasApplied={hasApplied}
          />
        </div>
      </div>
    </div>
  );
}
