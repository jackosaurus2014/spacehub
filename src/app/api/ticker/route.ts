import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { PRE_IPO_SLUGS } from '@/lib/company-roster';

/**
 * GET /api/ticker?persona=investor|professional|enthusiast
 *
 * Returns a dynamic feed of ticker items tailored to the user's persona.
 * Items include: stock prices, funding rounds, news headlines, livestreams,
 * upcoming launches, and blog posts.
 *
 * Cached for 3 minutes.
 */
export async function GET(request: NextRequest) {
  const persona = request.nextUrl.searchParams.get('persona') || 'enthusiast';

  try {
    const items: TickerItem[] = [];

    // ── 1. Public space company stock prices (investor + professional) ──
    if (persona === 'investor' || persona === 'professional') {
      const publicCompanies = await prisma.companyProfile.findMany({
        where: { isPublic: true, stockPrice: { not: null }, ticker: { not: null } },
        select: { name: true, ticker: true, stockPrice: true, priceChange24h: true, marketCap: true },
        orderBy: { marketCap: { sort: 'desc', nulls: 'last' } },
        take: 12,
      });

      for (const co of publicCompanies) {
        if (!co.ticker || !co.stockPrice) continue;
        const change = co.priceChange24h || 0;
        const arrow = change > 0 ? '▲' : change < 0 ? '▼' : '–';
        const color = change > 0 ? 'green' : change < 0 ? 'red' : 'neutral';
        items.push({
          type: 'stock',
          label: co.ticker,
          value: `$${co.stockPrice.toFixed(2)}`,
          change: `${arrow}${Math.abs(change).toFixed(1)}%`,
          color,
          priority: 1,
        });
      }
    }

    // ── 2. Recent funding rounds (investor) ──
    if (persona === 'investor') {
      const recentRounds = await prisma.fundingRound.findMany({
        where: { amount: { not: null } },
        select: {
          amount: true,
          seriesLabel: true,
          company: { select: { name: true } },
        },
        orderBy: { date: 'desc' },
        take: 5,
      });

      for (const round of recentRounds) {
        if (!round.amount) continue;
        const amountM = round.amount / 1_000_000; // FundingRound.amount is USD
        items.push({
          type: 'funding',
          label: `${round.company.name}`,
          value: `$${amountM >= 1000 ? `${(amountM / 1000).toFixed(1)}B` : `${amountM.toFixed(0)}M`} ${round.seriesLabel || ''}`,
          color: 'cyan',
          priority: 2,
        });
      }
    }

    // ── 3. Latest news headlines (all personas) ──
    const newsArticles = await prisma.newsArticle.findMany({
      select: { title: true, source: true, category: true, url: true },
      orderBy: { publishedAt: 'desc' },
      take: persona === 'enthusiast' ? 8 : 5,
    });

    for (const article of newsArticles) {
      items.push({
        type: 'news',
        label: article.source,
        value: article.title.length > 80 ? article.title.slice(0, 77) + '...' : article.title,
        url: `/news`,
        color: 'neutral',
        priority: 3,
      });
    }

    // ── 4. Active livestreams (all personas, high priority) ──
    const liveEvents = await prisma.spaceEvent.findMany({
      where: { isLive: true },
      select: { name: true, streamUrl: true, agency: true },
      take: 3,
    });

    for (const ev of liveEvents) {
      items.push({
        type: 'live',
        label: '● LIVE',
        value: `${ev.name}${ev.agency ? ` — ${ev.agency}` : ''}`,
        url: ev.streamUrl || '/launch-manifest',
        color: 'red',
        priority: 0, // Highest priority
      });
    }

    // ── 5. Upcoming launches (enthusiast + professional) ──
    if (persona === 'enthusiast' || persona === 'professional') {
      const upcoming = await prisma.spaceEvent.findMany({
        where: {
          type: 'launch',
          status: { in: ['upcoming', 'tbd'] },
          launchDate: { gte: new Date() },
        },
        select: { name: true, launchDate: true, rocket: true, agency: true },
        orderBy: { launchDate: 'asc' },
        take: 3,
      });

      for (const launch of upcoming) {
        const timeUntil = launch.launchDate
          ? formatTimeUntil(launch.launchDate)
          : 'TBD';
        items.push({
          type: 'launch',
          label: timeUntil,
          value: `${launch.rocket || launch.name}${launch.agency ? ` — ${launch.agency}` : ''}`,
          url: '/launch-manifest',
          color: 'amber',
          priority: 2,
        });
      }
    }

    // ── 6. Latest blog posts from our site (all personas) ──
    const blogs = await prisma.blogPost.findMany({
      select: { title: true, url: true, source: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 3,
    });

    for (const post of blogs) {
      items.push({
        type: 'blog',
        label: post.source?.name || 'SpaceNexus',
        value: post.title.length > 70 ? post.title.slice(0, 67) + '...' : post.title,
        url: post.url,
        color: 'indigo',
        priority: 4,
      });
    }

    // ── 7. Pre-IPO companies (investor only) ──
    if (persona === 'investor') {
      const preIpo = await prisma.companyProfile.findMany({
        where: { slug: { in: PRE_IPO_SLUGS }, isPublic: false, valuation: { not: null } },
        select: { name: true, valuation: true },
        orderBy: { valuation: { sort: 'desc', nulls: 'last' } },
        take: 3,
      });

      for (const co of preIpo) {
        const valuationB = co.valuation ? co.valuation / 1_000_000_000 : null; // CompanyProfile.valuation is USD
        items.push({
          type: 'preipo',
          label: 'Pre-IPO',
          value: `${co.name} — $${valuationB?.toFixed(1)}B`,
          color: 'purple',
          priority: 3,
        });
      }
    }

    // Sort by priority (lower = more important), then shuffle within same priority
    items.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return Math.random() - 0.5;
    });

    return NextResponse.json(
      { items, persona, count: items.length },
      { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' } },
    );
  } catch (error) {
    console.error('Ticker API error:', error);
    return NextResponse.json({ items: [], persona, count: 0 });
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface TickerItem {
  type: 'stock' | 'funding' | 'news' | 'live' | 'launch' | 'blog' | 'preipo';
  label: string;
  value: string;
  change?: string;
  url?: string;
  color: 'green' | 'red' | 'neutral' | 'cyan' | 'amber' | 'indigo' | 'purple';
  priority: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeUntil(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms < 0) return 'NOW';
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 7) return `T-${days}d`;
  if (days > 0) return `T-${days}d ${hours % 24}h`;
  if (hours > 0) return `T-${hours}h`;
  const mins = Math.floor(ms / 60000);
  return `T-${mins}m`;
}
