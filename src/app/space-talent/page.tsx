/**
 * /space-talent — SERVER component.
 *
 * This page used to be `'use client'` end to end, and because the interactive
 * half calls useSearchParams() the statically prerendered HTML was the
 * Suspense fallback — a spinner — for every crawler and every no-JS client.
 * The shell (h1, hero, JSON-LD) is now real server HTML, and the landing
 * tab's first screen of data is read here at request time and handed to the
 * client island as initial props so the seeded rows render into the HTML too
 * (pattern: news/page.tsx + NewsPageClient, company-profiles).
 *
 * Prisma is read at request time and the Railway BUILD container has no
 * database, so this must stay `force-dynamic` and every DB read must be
 * inside a try/catch that degrades to "the client will fetch it".
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import ItemListSchema from '@/components/seo/ItemListSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { logger } from '@/lib/logger';
import {
  getJobPostings,
  getWorkforceTrends,
  getWorkforceStats,
  getSalaryBenchmarks,
} from '@/lib/workforce-data';
import { SPACE_TALENT_SEED } from '@/lib/talent-board-data';
import { getModuleContent, mergeCuratedWithDynamic } from '@/lib/dynamic-content';
import type { SpaceTalent } from '@/types';
import SpaceTalentClient from './SpaceTalentClient';
import {
  JOBS_PER_PAGE,
  TALENT_FIRST_SCREEN_LIMIT,
  computeTalentStats,
  type TalentFirstScreen,
  type WorkforceFirstScreen,
} from './shared';

export const dynamic = 'force-dynamic';

// Metadata moved here from layout.tsx when the page became a server component.
export const metadata: Metadata = {
  title: 'Space Jobs & Workforce Intelligence',
  description: 'Find space industry jobs and workforce data. Browse aerospace job postings, salary benchmarks, talent trends, and skills demand across the space sector.',
  keywords: [
    'space jobs',
    'aerospace careers',
    'space industry jobs',
    'space workforce',
    'satellite engineer jobs',
    'rocket scientist salary',
  ],
  openGraph: {
    title: 'Space Jobs & Workforce Intelligence | SpaceNexus',
    description: 'Find space industry jobs, salary benchmarks, and workforce intelligence.',
    url: 'https://spacenexus.us/space-talent',
    // Image comes from the co-located opengraph-image.tsx file convention,
    // which renders the live open-job count — do not add a static images array here.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Jobs & Workforce Intelligence | SpaceNexus',
    description: 'Find space industry jobs, salary benchmarks, and workforce intelligence.',
    // Image comes from the co-located opengraph-image.tsx file convention.
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-talent',
  },
};

type SearchParams = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * The default experts view, mirroring /api/space-jobs/talent with no filters
 * (curated seed merged with the AI-refreshed DynamicContent roster). It MUST
 * match that route's default query — same merge, same limit — or hydration
 * would show a different roster than the crawler saw.
 */
async function getTalentFirstScreen(): Promise<TalentFirstScreen | null> {
  try {
    let allTalent: SpaceTalent[] = SPACE_TALENT_SEED.map((t, index) => ({
      ...t,
      id: `talent-${index + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as SpaceTalent[];
    let oldestRefreshedAt: string | null = null;

    try {
      const dynamicData = await getModuleContent<SpaceTalent>('talent-board');
      if (dynamicData.length > 0) {
        const res = mergeCuratedWithDynamic(
          allTalent,
          dynamicData.map((item) => item.data),
          (t) => t?.slug,
          (t) => typeof t?.slug === 'string' && typeof t?.name === 'string' && typeof t?.title === 'string',
        );
        allTalent = res.merged;
        const oldest = dynamicData.reduce(
          (earliest, item) => (item.refreshedAt < earliest ? item.refreshedAt : earliest),
          dynamicData[0].refreshedAt,
        );
        oldestRefreshedAt = oldest.toISOString();
      }
    } catch {
      // DynamicContent unavailable — the curated seed roster still renders.
    }

    return {
      // JSON round-trip so no Date object crosses the server/client boundary.
      talent: JSON.parse(JSON.stringify(allTalent.slice(0, TALENT_FIRST_SCREEN_LIMIT))) as SpaceTalent[],
      stats: computeTalentStats(allTalent),
      asOf: oldestRefreshedAt,
    };
  } catch (error) {
    logger.warn('space-talent: server-side talent first screen failed; client will fetch', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * The default workforce view, mirroring /api/workforce with no filters:
 * first JOBS_PER_PAGE active jobs (postedDate desc) plus the trends, stats
 * and salary benchmarks that same response carries.
 */
async function getWorkforceFirstScreen(): Promise<WorkforceFirstScreen | null> {
  try {
    const [jobsResult, trends, stats, benchmarks] = await Promise.all([
      getJobPostings({ limit: JOBS_PER_PAGE, offset: 0 }),
      getWorkforceTrends(),
      getWorkforceStats(),
      getSalaryBenchmarks(),
    ]);
    return JSON.parse(
      JSON.stringify({
        jobs: jobsResult.jobs,
        totalJobs: jobsResult.total,
        trends,
        stats,
        benchmarks,
      }),
    ) as WorkforceFirstScreen;
  } catch (error) {
    logger.warn('space-talent: server-side workforce first screen failed; client will fetch', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export default async function SpaceTalentHubPage({ searchParams }: { searchParams?: SearchParams }) {
  const sp = searchParams ?? {};
  const tab = str(sp.tab);
  // Mirrors the client's mapping, including the 2026-08-31 tab=jobs → workforce
  // aliasing (/jobs 308-redirects here as ?tab=jobs). Keep the two in sync.
  const landing: 'talent' | 'workforce' | 'gigs' =
    tab === 'workforce' || tab === 'jobs' ? 'workforce' : tab === 'gigs' ? 'gigs' : 'talent';
  // Any job filter in the URL and the default query no longer matches — let
  // the client fetch the filtered view exactly as it always has.
  const hasJobFilters = Boolean(str(sp.category) || str(sp.seniority) || str(sp.search) || sp.remote === 'true');

  const [talentFirst, workforceFirst] = await Promise.all([
    landing === 'talent' ? getTalentFirstScreen() : Promise.resolve(null),
    landing === 'workforce' && !hasJobFilters ? getWorkforceFirstScreen() : Promise.resolve(null),
  ]);

  const provenance =
    landing === 'workforce'
      ? workforceFirst
        ? `${workforceFirst.totalJobs.toLocaleString('en-US')} open positions · synced daily from company career boards`
        : 'Open positions load from the live database.'
      : landing === 'gigs'
        ? 'Freelance and contract gigs from independent space-industry specialists.'
        : talentFirst
          ? `${talentFirst.stats.totalExperts.toLocaleString('en-US')} expert consultants · ${talentFirst.stats.availableCount.toLocaleString('en-US')} available now`
          : 'The expert roster loads from the live database.';

  return (
    <div className="min-h-screen bg-space-900 py-8">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Talent Hub' }]} />
      <ItemListSchema
        name="Space Talent Hub"
        description="Space industry job listings, expert consultants, salary benchmarks, and workforce analytics"
        url="/space-talent"
        items={[
          { name: 'Space Industry Jobs', url: '/space-talent?tab=workforce', description: 'Browse open positions in the space industry' },
          { name: 'Expert Consultants', url: '/space-talent?tab=talent', description: 'Connect with space industry consultants and advisors' },
          { name: 'Salary Benchmarks', url: '/space-talent?tab=workforce&wfTab=salaries', description: 'Space industry salary data by role and seniority' },
          { name: 'Industry Insights', url: '/space-talent?tab=workforce&wfTab=insights', description: 'Space workforce sector employment, skills demand, and education pipeline analytics' },
          { name: 'Gig Board', url: '/space-talent?tab=gigs', description: 'Freelance and contract gig opportunities in the space industry' },
        ]}
      />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-talent-hub.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="container mx-auto px-4 pt-6 pb-2">
          {/* Static h1 (was AnimatedPageHeader) so the page's promise is in the
              HTML for crawlers and no-JS clients — mission-control pattern. */}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Space Talent Hub
          </h1>
          <div className="mt-2 h-0.5 w-16 rounded-full bg-gradient-to-r from-emerald-400/80 to-transparent" aria-hidden="true" />
          <p className="mt-3 text-slate-400 max-w-2xl">
            Expert consultants, webinars, job listings, salary benchmarks, and workforce analytics
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
            {provenance}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <SpaceTalentClient initialTalent={talentFirst} initialWorkforce={workforceFirst} />
      </div>
    </div>
  );
}
