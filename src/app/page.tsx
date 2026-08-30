import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { getHomeData } from '@/lib/home-data';
import { missionOf } from '@/lib/next-launch';
import { chartOfTheWeekSlug, getChartDef } from '@/lib/charts/registry';
import NextLaunchHero from '@/components/home/NextLaunchHero';
import NextFiveRail from '@/components/home/NextFiveRail';
import TycoonBand from '@/components/home/TycoonBand';
import Console from '@/components/ui/Console';

// Mission Control homepage (docs/research-2026-08-30/SYNTHESIS.md, item 15).
// The hero is the next launch; the board is the second thing you see; the
// industry half is one click away and never in the hero. The trial funnel
// (HowItWorks, SocialProof, DemoShowcase, BentoFeatures) moved intact to
// /pricing. Three moving things per page: the live pip, the clock, hover.

const NewsletterSignup = nextDynamic(() => import('@/components/NewsletterSignup'), {
  loading: () => <div className="h-40 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)]" />,
});
const LiveStreamSection = nextDynamic(() => import('@/components/landing/LiveStreamSection'), {
  loading: () => <div className="h-64 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)]" />,
});

// Stays force-dynamic: the Railway build container has no database, so an
// ISR revalidate would prerender against nothing and fail the build. The
// per-hit DB cost is handled by unstable_cache inside getHomeData.
export const dynamic = 'force-dynamic';

const CATEGORY_CHIP: Record<string, string> = {
  regulatory: 'text-[var(--caution)] border-[rgba(255,197,61,.35)]',
  market: 'text-[var(--go)] border-[rgba(86,240,0,.3)]',
  policy: 'text-[var(--caution)] border-[rgba(255,197,61,.35)]',
};

function rel(d: Date | null, now: Date): string {
  if (!d) return 'TBD';
  const h = Math.max(0, Math.round((d.getTime() - now.getTime()) / 3600000));
  return h === 0 ? 'LIVE' : `T−${h}h`;
}

function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${Math.round(v / 1e6)}M`;
  return `$${Math.round(v).toLocaleString()}`;
}

export default async function HomePage() {
  const data = await getHomeData();
  const now = new Date();
  const asOf = new Date(data.asOf);
  const next48 = data.upcoming.filter((r) => r.launchDate && r.launchDate.getTime() - now.getTime() < 48 * 3600000 && r.launchDate.getTime() > now.getTime() - 3600000).slice(0, 5);
  const chartSlug = chartOfTheWeekSlug(now);
  const chart = getChartDef(chartSlug);
  const slipMax = data.slipSeries ? Math.max(1, ...data.slipSeries.values) : 1;

  return (
    <div className="min-h-screen bg-[var(--void)]">
      <NextLaunchHero next={data.next} slips={data.nextSlips} />
      <NextFiveRail rows={data.upcoming} excludeId={data.next?.id} now={asOf} />

      {/* On the pad now */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-baseline justify-between gap-4 mb-6 pb-3 border-b border-[var(--line)]">
            <h2 className="text-[22px] font-semibold text-[var(--ink)]">On the pad now</h2>
            <Link href="/live" className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ember)]">All live streams &rarr;</Link>
          </div>
          <LiveStreamSection />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
            <Console title="Next 48 hours" source="Launch Library 2" asOf={asOf} status="live">
              {next48.length === 0 ? (
                <p className="text-[13px] text-[var(--ink-3)]">Nothing on the board in the next two days — the next window is on the rail above.</p>
              ) : (
                <ul>
                  {next48.map((r) => (
                    <li key={r.id} className="flex gap-3 py-2.5 border-b border-[var(--line)] last:border-0">
                      <span className="font-mono text-[12.5px] text-[var(--ember)] w-16 flex-shrink-0 tabular-nums">{rel(r.launchDate, asOf)}</span>
                      <Link href={`/launch/${r.id}`} className="text-[13.5px] text-[var(--ink)] hover:text-[var(--ember)] leading-snug">
                        {missionOf(r.name)}
                        <span className="block text-[12px] text-[var(--ink-3)] mt-0.5">{[r.rocket?.replace(/ Block 5$/, ''), r.location?.split(',')[0]].filter(Boolean).join(' · ')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Console>
            <Console title="Launch slips per week" source="SpaceNexus slip history" asOf={asOf} status={data.slipSeries ? 'verified' : 'delayed'}>
              {data.slipSeries ? (
                <>
                  <div className="flex items-end gap-1.5 h-20 mb-1" role="img" aria-label={`Launch date slips per week over the last ${data.slipSeries.values.length} weeks: ${data.slipSeries.values.join(', ')}.`}>
                    {data.slipSeries.values.map((v, i) => (
                      <i key={i} className={`flex-1 rounded-t-[2px] ${v === slipMax ? 'bg-[var(--ember)]' : 'bg-[var(--ember-deep)]'}`} style={{ height: `${Math.max(4, (v / slipMax) * 100)}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between font-mono text-[10.5px] text-[var(--ink-3)]"><span>{data.slipSeries.labels[0]}</span><span>this week</span></div>
                  <p className="text-[12px] text-[var(--ink-3)] mt-3">Scheduled launches that moved by more than a minute. Nobody else records this — <Link href="/chart/launch-slips-by-week" className="text-[var(--ember)]">see the chart &rarr;</Link></p>
                </>
              ) : (
                <p className="text-[13px] text-[var(--ink-3)]">Slip history is accumulating — every manifest change since 29 August is recorded; the weekly chart appears once there are a few weeks of it. <Link href="/chart" className="text-[var(--ember)]">Charts &rarr;</Link></p>
              )}
            </Console>
          </div>
        </div>
      </section>

      {/* The industry today */}
      <section className="pb-10 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-baseline justify-between gap-4 mb-6 pb-3 border-b border-[var(--line)]">
            <h2 className="text-[22px] font-semibold text-[var(--ink)]">The industry today</h2>
            <Link href="/tools" className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ember)]">Everything on SpaceNexus &rarr;</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-7">
            {[
              { href: '/satellites', label: 'Satellites tracked', value: data.tiles.satellites, sub: 'active in the catalogue · CelesTrak', tone: 'text-[var(--signal)]' },
              { href: '/company-profiles', label: 'Companies profiled', value: data.tiles.companies, sub: 'public and private, with live quotes', tone: 'text-[var(--ink)]' },
              { href: '/funding-tracker', label: 'Private funding · 12 mo', value: data.tiles.funding12mo != null ? fmtUsd(data.tiles.funding12mo) : 'unavailable', sub: data.tiles.funding12mo != null ? 'disclosed rounds' : 'funding data did not answer', tone: data.tiles.funding12mo != null ? 'text-[var(--ember)]' : 'text-[var(--ink-3)]' },
              { href: '/space-environment', label: 'Space weather', value: data.tiles.kp != null ? (data.tiles.kp >= 5 ? 'Storm' : data.tiles.kp >= 4 ? 'Unsettled' : 'Quiet') : 'unavailable', sub: data.tiles.kp != null ? `Kp ${data.tiles.kp} · NOAA SWPC` : 'NOAA feed did not answer', tone: data.tiles.kp != null ? (data.tiles.kp >= 5 ? 'text-[var(--crit)]' : data.tiles.kp >= 4 ? 'text-[var(--caution)]' : 'text-[var(--go)]') : 'text-[var(--ink-3)]' },
            ].map((t) => (
              <Link key={t.href} href={t.href} className="block rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-4 md:p-[18px] hover:border-[var(--line-2)] hover:bg-[var(--elev)] transition-colors">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">{t.label}</p>
                <p className={`font-mono font-bold text-[24px] md:text-[30px] tracking-[-0.02em] tabular-nums mt-2 mb-1 ${t.tone}`}>{t.value}</p>
                <p className="text-[12px] text-[var(--ink-3)]">{t.sub}</p>
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.stories.map((s) => (
              <Link key={s.href} href={s.href} className="flex flex-col gap-2 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-[18px] hover:border-[var(--line-2)] hover:bg-[var(--elev)] transition-colors">
                <span className={`self-start text-[10.5px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded border ${CATEGORY_CHIP[s.category] ?? 'text-[var(--ink-2)] border-[var(--line-2)]'}`}>{s.category}</span>
                <h3 className="text-[16px] font-semibold text-[var(--ink)] leading-snug">{s.title}</h3>
                <p className="text-[13px] text-[var(--ink-2)] leading-relaxed line-clamp-3">{s.summary}</p>
                <span className="mt-auto font-mono text-[11px] text-[var(--ink-3)]">{s.source}</span>
              </Link>
            ))}
            {chart && (
              <Link href={`/chart/${chart.slug}`} className="md:col-span-3 flex flex-col sm:flex-row sm:items-center gap-4 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-[18px] hover:border-[var(--line-2)] transition-colors">
                <img src={`/api/chart/${chart.slug}?format=svg`} alt="" width={1200} height={630} className="w-full sm:w-64 h-auto rounded-[var(--radius-control)] border border-[var(--line)]" loading="lazy" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">Chart of the week</p>
                  <h3 className="text-[16px] font-semibold text-[var(--ink)] mt-1">{chart.title}</h3>
                  <p className="text-[13px] text-[var(--ink-2)] mt-1">{chart.subtitle}. Drawn from our own trackers; the numbers, PNG and permalink are on the chart page.</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      <TycoonBand topCorps={data.topCorps} />

      {/* Digest */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <NewsletterSignup variant="cta" source="homepage_cta" />
        </div>
      </section>
    </div>
  );
}
