import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// ============================================================
// Types
// ============================================================

interface WatchedCompanyNews {
  companyId: string;
  companyName: string;
  companySlug: string;
  articles: {
    id: string;
    title: string;
    summary: string | null;
    source: string;
    url: string;
    publishedAt: string;
  }[];
}

interface PipelineSnapshot {
  rfqs: { open: number; evaluating: number; awarded: number; cancelled: number; total: number };
  proposals: { submitted: number; shortlisted: number; awarded: number; rejected: number; total: number };
}

interface RegulatoryDeadline {
  id: string;
  title: string;
  agency: string;
  category: string;
  impactSeverity: string | null;
  commentDeadline: string;
  effectiveDate: string | null;
  status: string;
  sourceUrl: string;
  daysUntilDeadline: number;
}

interface CompanyEventItem {
  id: string;
  companyId: string;
  companyName: string;
  date: string;
  type: string;
  title: string;
  description: string | null;
  importance: number;
}

interface MarketPulse {
  latestNews: {
    title: string;
    source: string;
    url: string;
    publishedAt: string;
  } | null;
  nextLaunch: {
    name: string;
    date: string;
    agency: string | null;
    location: string | null;
    status: string | null;
  } | null;
  activeSatellites: number;
}

interface PendingAlert {
  id: string;
  title: string;
  message: string;
  channel: string;
  source: string;
  createdAt: string;
}

interface BriefingResponse {
  generatedAt: string;
  userName: string | null;
  myCompany: {
    id: string;
    name: string;
    slug: string;
  } | null;
  myCompanyNews: WatchedCompanyNews | null;
  competitorWatch: WatchedCompanyNews[];
  pipeline: PipelineSnapshot;
  regulatoryDeadlines: RegulatoryDeadline[];
  recentActivity: CompanyEventItem[];
  marketPulse: MarketPulse;
  pendingAlerts: PendingAlert[];
}

// ============================================================
// GET handler
// ============================================================

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch user with claimed company and watchlist in one query
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        claimedCompanyId: true,
        companyWatchlist: {
          select: {
            companyProfileId: true,
            priority: true,
            companyProfile: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const watchedCompanyIds = user.companyWatchlist.map((w) => w.companyProfileId);
    const allCompanyIds = user.claimedCompanyId
      ? [user.claimedCompanyId, ...watchedCompanyIds.filter((id) => id !== user.claimedCompanyId)]
      : watchedCompanyIds;

    // Fetch user's claimed company details if applicable
    let myCompany: BriefingResponse['myCompany'] = null;
    if (user.claimedCompanyId) {
      const company = await prisma.companyProfile.findUnique({
        where: { id: user.claimedCompanyId },
        select: { id: true, name: true, slug: true },
      });
      if (company) {
        myCompany = company;
      }
    }

    // Run all aggregate queries in parallel
    const [
      watchedCompanyNewsResult,
      rfqCountsResult,
      proposalCountsResult,
      regulationsResult,
      companyEventsResult,
      latestNewsResult,
      nextLaunchResult,
      satelliteCountResult,
      pendingAlertsResult,
    ] = await Promise.allSettled([
      // 1. News articles for all watched/claimed companies (last 7 days)
      allCompanyIds.length > 0
        ? prisma.newsArticle.findMany({
            where: {
              publishedAt: { gte: sevenDaysAgo },
              companyTags: {
                some: {
                  id: { in: allCompanyIds },
                },
              },
            },
            select: {
              id: true,
              title: true,
              summary: true,
              source: true,
              url: true,
              publishedAt: true,
              companyTags: {
                where: { id: { in: allCompanyIds } },
                select: { id: true, name: true, slug: true },
              },
            },
            orderBy: { publishedAt: 'desc' },
            take: 50,
          })
        : Promise.resolve([]),

      // 2. RFQ counts by status (user's posted RFQs)
      prisma.rFQ.groupBy({
        by: ['status'],
        where: { buyerUserId: userId },
        _count: { id: true },
      }),

      // 3. Proposal counts by status (for user's company)
      user.claimedCompanyId
        ? prisma.proposal.groupBy({
            by: ['status'],
            where: { companyId: user.claimedCompanyId },
            _count: { id: true },
          })
        : Promise.resolve([]),

      // 4. Regulatory deadlines within 30 days
      prisma.proposedRegulation.findMany({
        where: {
          commentDeadline: {
            gte: now,
            lte: thirtyDaysFromNow,
          },
          status: { in: ['open', 'comment_period'] },
        },
        select: {
          id: true,
          title: true,
          agency: true,
          category: true,
          impactSeverity: true,
          commentDeadline: true,
          effectiveDate: true,
          status: true,
          sourceUrl: true,
        },
        orderBy: { commentDeadline: 'asc' },
        take: 20,
      }),

      // 5. Company events for watched companies (last 7 days)
      allCompanyIds.length > 0
        ? prisma.companyEvent.findMany({
            where: {
              companyId: { in: allCompanyIds },
              date: { gte: sevenDaysAgo },
            },
            select: {
              id: true,
              companyId: true,
              date: true,
              type: true,
              title: true,
              description: true,
              importance: true,
              company: {
                select: { name: true },
              },
            },
            orderBy: { date: 'desc' },
            take: 30,
          })
        : Promise.resolve([]),

      // 6. Latest news headline (market pulse)
      prisma.newsArticle.findFirst({
        select: {
          title: true,
          source: true,
          url: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),

      // 7. Next upcoming launch (market pulse)
      prisma.spaceEvent.findFirst({
        where: {
          launchDate: { gte: now },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
        },
        select: {
          name: true,
          launchDate: true,
          agency: true,
          location: true,
          status: true,
        },
        orderBy: { launchDate: 'asc' },
      }),

      // 8. Active satellite count
      prisma.satelliteAsset.count({
        where: { status: 'active' },
      }),

      // 9. Pending alerts for user
      prisma.alertDelivery.findMany({
        where: {
          userId,
          status: { in: ['pending', 'sent'] },
          readAt: null,
        },
        select: {
          id: true,
          title: true,
          message: true,
          channel: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // ---- Process news by company ----
    const newsArticles =
      watchedCompanyNewsResult.status === 'fulfilled' ? watchedCompanyNewsResult.value : [];

    // Group articles by company
    const newsByCompanyMap = new Map<string, WatchedCompanyNews>();
    for (const article of newsArticles) {
      for (const company of article.companyTags) {
        if (!newsByCompanyMap.has(company.id)) {
          newsByCompanyMap.set(company.id, {
            companyId: company.id,
            companyName: company.name,
            companySlug: company.slug,
            articles: [],
          });
        }
        const entry = newsByCompanyMap.get(company.id)!;
        // Avoid duplicating articles within same company
        if (!entry.articles.some((a) => a.id === article.id)) {
          entry.articles.push({
            id: article.id,
            title: article.title,
            summary: article.summary,
            source: article.source || 'Unknown',
            url: article.url,
            publishedAt: article.publishedAt.toISOString(),
          });
        }
      }
    }

    // Split into my company vs competitors
    const myCompanyNews = myCompany ? newsByCompanyMap.get(myCompany.id) || null : null;
    const competitorWatch: WatchedCompanyNews[] = [];
    const companyIds = Array.from(newsByCompanyMap.keys());
    for (const companyId of companyIds) {
      if (companyId !== user.claimedCompanyId) {
        competitorWatch.push(newsByCompanyMap.get(companyId)!);
      }
    }
    // Sort competitors by number of articles (most active first)
    competitorWatch.sort((a, b) => b.articles.length - a.articles.length);

    // ---- Process pipeline snapshot ----
    const rfqGroups =
      rfqCountsResult.status === 'fulfilled'
        ? (rfqCountsResult.value as { status: string; _count: { id: number } }[])
        : [];
    const proposalGroups =
      proposalCountsResult.status === 'fulfilled'
        ? (proposalCountsResult.value as { status: string; _count: { id: number } }[])
        : [];

    const rfqCounts = { open: 0, evaluating: 0, awarded: 0, cancelled: 0, total: 0 };
    for (const g of rfqGroups) {
      const count = g._count.id;
      rfqCounts.total += count;
      if (g.status === 'open') rfqCounts.open = count;
      else if (g.status === 'evaluating') rfqCounts.evaluating = count;
      else if (g.status === 'awarded') rfqCounts.awarded = count;
      else if (g.status === 'cancelled') rfqCounts.cancelled = count;
    }

    const proposalCounts = { submitted: 0, shortlisted: 0, awarded: 0, rejected: 0, total: 0 };
    for (const g of proposalGroups) {
      const count = g._count.id;
      proposalCounts.total += count;
      if (g.status === 'submitted') proposalCounts.submitted = count;
      else if (g.status === 'shortlisted') proposalCounts.shortlisted = count;
      else if (g.status === 'awarded') proposalCounts.awarded = count;
      else if (g.status === 'rejected') proposalCounts.rejected = count;
    }

    // ---- Process regulatory deadlines ----
    const regulations =
      regulationsResult.status === 'fulfilled' ? regulationsResult.value : [];
    const regulatoryDeadlines: RegulatoryDeadline[] = regulations.map((reg) => {
      const deadlineDate = reg.commentDeadline!;
      const daysUntil = Math.ceil(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id: reg.id,
        title: reg.title,
        agency: reg.agency,
        category: reg.category,
        impactSeverity: reg.impactSeverity,
        commentDeadline: deadlineDate.toISOString(),
        effectiveDate: reg.effectiveDate?.toISOString() || null,
        status: reg.status,
        sourceUrl: reg.sourceUrl,
        daysUntilDeadline: daysUntil,
      };
    });

    // ---- Process company events ----
    const rawEvents =
      companyEventsResult.status === 'fulfilled' ? companyEventsResult.value : [];
    const recentActivity: CompanyEventItem[] = rawEvents.map((evt) => ({
      id: evt.id,
      companyId: evt.companyId,
      companyName: evt.company.name,
      date: evt.date.toISOString(),
      type: evt.type,
      title: evt.title,
      description: evt.description,
      importance: evt.importance,
    }));

    // ---- Process market pulse ----
    const latestNews =
      latestNewsResult.status === 'fulfilled' && latestNewsResult.value
        ? {
            title: latestNewsResult.value.title,
            source: latestNewsResult.value.source || 'Unknown',
            url: latestNewsResult.value.url,
            publishedAt: latestNewsResult.value.publishedAt.toISOString(),
          }
        : null;

    const nextLaunch =
      nextLaunchResult.status === 'fulfilled' && nextLaunchResult.value
        ? {
            name: nextLaunchResult.value.name,
            date: nextLaunchResult.value.launchDate
              ? nextLaunchResult.value.launchDate.toISOString()
              : now.toISOString(),
            agency: nextLaunchResult.value.agency,
            location: nextLaunchResult.value.location,
            status: nextLaunchResult.value.status,
          }
        : null;

    const activeSatellites =
      satelliteCountResult.status === 'fulfilled' ? satelliteCountResult.value : 0;

    // ---- Process pending alerts ----
    const rawAlerts =
      pendingAlertsResult.status === 'fulfilled' ? pendingAlertsResult.value : [];
    const pendingAlerts: PendingAlert[] = rawAlerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      channel: a.channel,
      source: a.source,
      createdAt: a.createdAt.toISOString(),
    }));

    // ---- Build response ----
    const briefing: BriefingResponse = {
      generatedAt: now.toISOString(),
      userName: user.name || session.user.name || null,
      myCompany,
      myCompanyNews,
      competitorWatch,
      pipeline: { rfqs: rfqCounts, proposals: proposalCounts },
      regulatoryDeadlines,
      recentActivity,
      marketPulse: { latestNews, nextLaunch, activeSatellites },
      pendingAlerts,
    };

    return NextResponse.json({ success: true, data: briefing });
  } catch (error) {
    logger.error('[Executive Briefing] Failed to generate briefing', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to generate executive briefing');
  }
}
