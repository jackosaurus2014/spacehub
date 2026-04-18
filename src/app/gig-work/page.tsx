import Link from 'next/link';
import type { Metadata } from 'next';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import GigFilterBar from './GigFilterBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gig Work | SpaceNexus',
  description:
    'Freelance and contract gig opportunities in the space industry — engineering, operations, policy, manufacturing, and more.',
};

const VALID_CATEGORIES = ['engineering', 'operations', 'business', 'research', 'legal', 'manufacturing'] as const;
const VALID_WORK_TYPES = ['freelance', 'contract', 'part_time', 'consulting', 'side_project'] as const;

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

interface SearchParams {
  category?: string;
  workType?: string;
  isRemote?: string;
  minBudget?: string;
  maxBudget?: string;
  q?: string;
  page?: string;
}

function formatBudget(
  min: number | null,
  max: number | null,
  type: string
): string {
  if (min == null && max == null) return 'Budget negotiable';
  const suffix = type === 'hourly' ? '/hr' : type === 'monthly' ? '/mo' : '';
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}${suffix}`;
  if (min != null) return `From ${fmt(min)}${suffix}`;
  if (max != null) return `Up to ${fmt(max)}${suffix}`;
  return 'Budget negotiable';
}

function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

async function fetchGigs(params: SearchParams) {
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { isActive: true };

  if (params.category && (VALID_CATEGORIES as readonly string[]).includes(params.category)) {
    where.category = params.category;
  }
  if (params.workType && (VALID_WORK_TYPES as readonly string[]).includes(params.workType)) {
    where.workType = params.workType;
  }
  if (params.isRemote === 'true') where.remoteOk = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: Record<string, any>[] = [];

  const minBudget = params.minBudget ? parseInt(params.minBudget, 10) : NaN;
  if (!Number.isNaN(minBudget) && minBudget >= 0) {
    andClauses.push({
      OR: [{ budgetMax: { gte: minBudget } }, { budgetMax: null }],
    });
  }
  const maxBudget = params.maxBudget ? parseInt(params.maxBudget, 10) : NaN;
  if (!Number.isNaN(maxBudget) && maxBudget >= 0) {
    andClauses.push({
      OR: [{ budgetMin: { lte: maxBudget } }, { budgetMin: null }],
    });
  }
  if (params.q && params.q.trim().length > 0) {
    const term = params.q.trim();
    andClauses.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { skills: { hasSome: [term.toLowerCase()] } },
      ],
    });
  }
  if (andClauses.length > 0) where.AND = andClauses;

  try {
    const [gigs, total] = await Promise.all([
      prisma.gigOpportunity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          employer: {
            select: {
              id: true,
              companyName: true,
              companySlug: true,
              logoUrl: true,
              verified: true,
            },
          },
        },
      }),
      prisma.gigOpportunity.count({ where }),
    ]);
    return { gigs, total, page, limit };
  } catch (error) {
    logger.error('Failed to load gig list', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { gigs: [], total: 0, page, limit };
  }
}

export default async function GigWorkListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { gigs, total, page, limit } = await fetchGigs(searchParams);
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'page') params.set(k, v);
    });
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/gig-work?${qs}` : '/gig-work';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold">Gig Work</h1>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Freelance and contract opportunities across the space industry — engineering, operations,
              policy, manufacturing, and more. Post a gig for free or apply in minutes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/gig-work/my-gigs"
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              My gigs
            </Link>
            <Link
              href="/gig-work/post"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 transition-colors"
            >
              Post a gig
            </Link>
          </div>
        </div>

        <GigFilterBar
          initial={{
            category: searchParams.category || '',
            workType: searchParams.workType || '',
            isRemote: searchParams.isRemote === 'true',
            minBudget: searchParams.minBudget || '',
            maxBudget: searchParams.maxBudget || '',
            q: searchParams.q || '',
          }}
        />

        <div className="mt-4 text-sm text-slate-400">
          {total === 0 ? 'No gigs found' : `${total} open gig${total === 1 ? '' : 's'}`}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gigs.map((gig) => (
            <Link
              key={gig.id}
              href={`/gig-work/${gig.id}`}
              className="group rounded-xl border border-white/20 bg-white/5 p-5 hover:border-white/40 hover:bg-white/[0.07] transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-base font-semibold text-white group-hover:text-white">
                  {gig.title}
                </h2>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {gig.remoteOk && (
                    <span className="text-xs bg-white/10 text-white/90 px-2 py-0.5 rounded">
                      Remote
                    </span>
                  )}
                  {gig.clearanceRequired && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                      Clearance
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-400 mb-3">
                {gig.employer?.companyName || 'Independent'}
                {gig.employer?.verified && (
                  <span className="ml-2 text-xs text-emerald-400">verified</span>
                )}
              </p>

              <p className="text-sm text-slate-300 mb-4 line-clamp-3">
                {gig.description}
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-white/10 px-2 py-0.5 text-white/90">
                  {CATEGORY_LABELS[gig.category] || gig.category}
                </span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-white/90">
                  {WORK_TYPE_LABELS[gig.workType] || gig.workType}
                </span>
                {gig.duration && (
                  <span className="rounded bg-white/10 px-2 py-0.5 text-white/90">
                    {gig.duration}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span className="text-white/90">
                  {formatBudget(gig.budgetMin, gig.budgetMax, gig.budgetType)}
                </span>
                <span>{timeAgo(gig.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>

        {gigs.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-slate-400">
              No gigs match your filters. Try adjusting them, or{' '}
              <Link href="/gig-work/post" className="underline hover:text-white">
                post the first gig
              </Link>
              .
            </p>
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildPageHref(page - 1)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-slate-400 px-2">
              Page {page} of {pageCount}
            </span>
            {page < pageCount && (
              <Link
                href={buildPageHref(page + 1)}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
