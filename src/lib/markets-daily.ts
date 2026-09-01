import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';
import { classifySection } from '@/lib/space-stock-buckets';

// G13 — Space Markets Daily (growth plan): the investor daily loop. No free
// space-sector market close exists anywhere; this is it. The SpaceNexus
// Pure-Play Index is the EQUAL-WEIGHTED mean of the day's percentage moves
// across pure-play public space companies (methodology stated on-page:
// equal-weighting so one mega-cap can't be the whole index; primes and
// broadline defense excluded via the shared classifier the stocks page uses).

export interface IndexMember {
  slug: string;
  name: string;
  ticker: string;
  changePct: number;
}

export interface MarketsDaily {
  asOf: string;
  index: {
    value: number | null; // mean daily % move, 2dp
    members: number;
    gainers: number;
    decliners: number;
  };
  topMovers: IndexMember[];
  bottomMovers: IndexMember[];
  deals: { company: string; slug: string | null; amount: number | null; series: string | null; date: string }[];
  contracts: { company: string; title: string; value: number | null; agency: string | null }[];
}

export const getMarketsDaily = unstable_cache(async (): Promise<MarketsDaily | null> => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 3600_000);
    const [stocks, rounds, awards] = await Promise.all([
      prisma.companyProfile.findMany({
        where: { ticker: { not: null }, NOT: { status: 'defunct' }, priceChange24h: { not: null } },
        select: { slug: true, name: true, ticker: true, sector: true, tags: true, priceChange24h: true },
      }),
      prisma.fundingRound.findMany({
        where: { createdAt: { gte: dayAgo } },
        orderBy: { amount: { sort: 'desc', nulls: 'last' } },
        take: 5,
        include: { company: { select: { name: true, slug: true } } },
      }),
      prisma.governmentContractAward.findMany({
        where: { createdAt: { gte: dayAgo } },
        orderBy: { value: { sort: 'desc', nulls: 'last' } },
        take: 5,
        select: { companyName: true, title: true, value: true, agency: true },
      }),
    ]);

    const purePlays: IndexMember[] = stocks
      .filter(s => classifySection(s.sector, s.tags) !== 'primes')
      .filter(s => typeof s.priceChange24h === 'number' && isFinite(s.priceChange24h!))
      .map(s => ({ slug: s.slug, name: s.name, ticker: s.ticker!, changePct: Math.round(s.priceChange24h! * 100) / 100 }));

    const value = purePlays.length >= 5
      ? Math.round((purePlays.reduce((a, m) => a + m.changePct, 0) / purePlays.length) * 100) / 100
      : null;

    const sorted = [...purePlays].sort((a, b) => b.changePct - a.changePct);

    return {
      asOf: new Date().toISOString(),
      index: {
        value,
        members: purePlays.length,
        gainers: purePlays.filter(m => m.changePct > 0).length,
        decliners: purePlays.filter(m => m.changePct < 0).length,
      },
      topMovers: sorted.slice(0, 5),
      bottomMovers: sorted.slice(-5).reverse(),
      deals: rounds.map(r => ({ company: r.company?.name || 'Unknown', slug: r.company?.slug || null, amount: r.amount, series: r.seriesLabel, date: r.date.toISOString() })),
      contracts: awards.map(a => ({ company: a.companyName, title: a.title, value: a.value, agency: a.agency })),
    };
  } catch {
    return null;
  }
}, ['markets-daily'], { revalidate: 900 });
