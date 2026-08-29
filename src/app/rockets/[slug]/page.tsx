import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import LaunchRow, { formatLaunchDate, missionTitle } from '@/components/launches/LaunchRow';
import LaunchWatchForm from '@/components/launches/LaunchWatchForm';
import LaunchCrossLinks from '@/components/launches/LaunchCrossLinks';
import { allRocketSlugs, getRocketEntry, getRocketLiveStats, getRocketSpec } from '@/lib/rockets';
import { LAUNCH_SITES } from '@/lib/launch-sites';

// Registry-backed route: every valid slug is enumerated below, so an unknown
// slug 404s at the router (real HTTP 404), while the page itself renders
// per request because the launch stats come from the DB (Railway's build
// container has no DB access).
export const dynamic = 'force-dynamic';
export const dynamicParams = false;

export function generateStaticParams() {
  return allRocketSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const spec = getRocketSpec(params.slug);
  if (!spec) return {};
  const price = spec.costMillions ? `~$${spec.costMillions}M per launch` : 'launch price';
  const perKg = spec.costPerKgLeo ? ` (~$${spec.costPerKgLeo.toLocaleString()}/kg to LEO)` : '';
  const title = `${spec.name}: Launch Cost, Next Launch, Specs & Record (2026)`;
  const description = `${spec.name} by ${spec.manufacturer}: ${price}${perKg}, ${spec.payloadLeoKg.toLocaleString()} kg to LEO, ${spec.successRate}% success rate. Live launch schedule, recent outcomes and full specifications.`;
  return {
    title,
    description,
    alternates: { canonical: `https://spacenexus.us/rockets/${params.slug}` },
    openGraph: { title, description, type: 'article', images: [{ url: `/api/og?title=${encodeURIComponent(spec.name)}&subtitle=${encodeURIComponent('Launch cost, next launch, specs & record')}&type=guide`, width: 1200, height: 630 }] },
  };
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function RocketPage({ params }: { params: { slug: string } }) {
  const spec = getRocketSpec(params.slug);
  const entry = getRocketEntry(params.slug);
  if (!spec || !entry) notFound();
  const now = new Date();
  const live = await getRocketLiveStats(params.slug, now);
  const siteLinks = live.sites
    .map((s) => ({ ...s, site: LAUNCH_SITES.find((x) => x.matcher.test(s.location)) }))
    .filter((s) => s.site);

  const faq = [
    { q: `How much does a ${spec.name} launch cost?`, a: spec.costMillions ? `A dedicated ${spec.name} launch lists at roughly $${spec.costMillions} million${spec.costPerKgLeo ? `, about $${spec.costPerKgLeo.toLocaleString()} per kilogram to low Earth orbit at full payload` : ''}. Actual contract prices vary with orbit, integration and government requirements.` : `${spec.manufacturer} has not published a list price for ${spec.name}.` },
    { q: `When is the next ${spec.name} launch?`, a: live.nextLaunch ? `The next tracked ${spec.name} launch is ${missionTitle(live.nextLaunch)} on ${formatLaunchDate(live.nextLaunch.launchDate)}${live.nextLaunch.location ? ` from ${live.nextLaunch.location}` : ''}. Dates move; Mission Control carries the live countdown.` : `No ${spec.name} launch is currently on the tracked manifest.` },
    { q: `How reliable is ${spec.name}?`, a: `${spec.name} has flown ${spec.totalLaunches} times with ${spec.successes} successes, ${spec.failures} failures and ${spec.partialFailures} partial failures — a ${spec.successRate}% success rate${spec.consecutiveSuccesses ? `, with ${spec.consecutiveSuccesses} consecutive successes at last count` : ''}.` },
    { q: `How much can ${spec.name} carry?`, a: `${spec.payloadLeoKg.toLocaleString()} kg to low Earth orbit${spec.payloadGtoKg ? `, ${spec.payloadGtoKg.toLocaleString()} kg to geostationary transfer orbit` : ''}${spec.payloadSsoKg ? `, ${spec.payloadSsoKg.toLocaleString()} kg to sun-synchronous orbit` : ''}${spec.payloadTliKg ? `, ${spec.payloadTliKg.toLocaleString()} kg to trans-lunar injection` : ''}.` },
  ];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/rockets" className="hover:text-white/80">Rockets</Link><span>/</span>
          <span className="text-slate-400">{spec.name}</span>
        </nav>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{spec.name}</h1>
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${spec.status === 'Operational' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : spec.status === 'Retired' ? 'bg-slate-500/15 text-slate-300 border-slate-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{spec.status}</span>
          </div>
          <p className="text-slate-400">{spec.manufacturer} · {spec.country}{spec.firstFlight ? ` · First flight ${spec.firstFlight.slice(0, 4)}` : ''}{spec.reusable ? ' · Reusable first stage' : ''}</p>
          <p className="text-slate-300 leading-relaxed mt-4 max-w-3xl">{spec.description}</p>
        </header>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Stat label="Launch price" value={spec.costMillions ? `~$${spec.costMillions}M` : 'Not published'} sub={spec.costPerKgLeo ? `~$${spec.costPerKgLeo.toLocaleString()}/kg to LEO` : undefined} />
          <Stat label="Payload to LEO" value={`${spec.payloadLeoKg.toLocaleString()} kg`} sub={spec.payloadGtoKg ? `${spec.payloadGtoKg.toLocaleString()} kg to GTO` : undefined} />
          <Stat label="Career record" value={`${spec.successRate}%`} sub={`${spec.successes}/${spec.totalLaunches} successful`} />
          <Stat label="Next launch" value={live.nextLaunch ? formatLaunchDate(live.nextLaunch.launchDate, false) : 'None scheduled'} sub={live.nextLaunch ? missionTitle(live.nextLaunch) : undefined} />
        </div>

        <div className="mb-10">
          <LaunchWatchForm rocket={spec.name.split(' Block')[0].split(' /')[0]} label={`every ${spec.name.split(' Block')[0].split(' /')[0]} launch`} source="rocket-page" />
          <p className="text-[11px] text-slate-500 mt-2">Have an account? <Link href={`/alerts?create=launch_status&rocket=${encodeURIComponent(spec.name.split(' Block')[0].split(' /')[0])}`} className="text-cyan-400 hover:text-cyan-300">Build a richer alert rule</Link> (GO / scrub / in-flight, by site too).</p>
        </div>

        {/* Live cadence */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-1">Launch activity, live</h2>
          <p className="text-xs text-slate-500 mb-4">
            From SpaceNexus&apos;s launch tracker{live.trackedSince ? ` (tracked since ${formatLaunchDate(live.trackedSince, false)})` : ''}; outcomes recorded as each flight lands. Career totals above are the vehicle&apos;s full history.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Last 90 days" value={String(live.last90Days)} sub="launches flown" />
            <Stat label="Tracked flights" value={String(live.flown)} sub={`${live.completed} success · ${live.failed} failed`} />
            <Stat label="Tracked success rate" value={live.successRatePct != null ? `${live.successRatePct}%` : '—'} />
            <Stat label="On the manifest" value={String(live.upcoming.length)} sub="upcoming launches" />
          </div>

          {live.upcoming.length > 0 && (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Upcoming</h3>
              <div className="space-y-2 mb-6">{live.upcoming.map((l) => <LaunchRow key={l.id} launch={l} showRocket={false} now={now} />)}</div>
            </>
          )}
          {live.recent.length > 0 && (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Recent</h3>
              <div className="space-y-2">{live.recent.map((l) => <LaunchRow key={l.id} launch={l} showRocket={false} now={now} />)}</div>
            </>
          )}
          {live.upcoming.length === 0 && live.recent.length === 0 && (
            <p className="text-sm text-slate-500">No {spec.name} launches on the tracked manifest yet.</p>
          )}
        </section>

        {/* Specs */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Specifications</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Height', `${spec.heightM} m`], ['Diameter', `${spec.diameterM} m`], ['Liftoff mass', `${spec.massKg.toLocaleString()} kg`],
                  ['Stages', String(spec.stages)], ['Engines', spec.engines], ['Propellant', spec.propellant],
                  ['Fairing diameter', spec.fairingDiameterM ? `${spec.fairingDiameterM} m` : '—'],
                  ['Payload to LEO', `${spec.payloadLeoKg.toLocaleString()} kg`], ['Payload to GTO', spec.payloadGtoKg ? `${spec.payloadGtoKg.toLocaleString()} kg` : '—'],
                  ['Payload to SSO', spec.payloadSsoKg ? `${spec.payloadSsoKg.toLocaleString()} kg` : '—'], ['Payload to TLI', spec.payloadTliKg ? `${spec.payloadTliKg.toLocaleString()} kg` : '—'],
                  ['Reusable', spec.reusable ? 'Yes (first stage)' : 'No'], ['First flight', spec.firstFlight ?? '—'], ['Last flight', spec.lastFlight ?? (spec.status === 'Operational' ? 'Active' : '—')],
                  ['Variants seen on the manifest', live.variants.length ? live.variants.join(', ') : '—'],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-white/[0.06] last:border-0">
                    <td className="px-4 py-2.5 text-slate-400 w-56">{k}</td>
                    <td className="px-4 py-2.5 text-white">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Where it flies */}
        {siteLinks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-3">Where it launches from</h2>
            <div className="flex flex-wrap gap-2">
              {siteLinks.map((s) => (
                <Link key={s.location} href={`/launches/${s.site!.slug}`} className="card px-3 py-2 text-sm text-slate-300 hover:text-white hover:border-cyan-500/30 transition-colors">
                  {s.site!.name} <span className="text-slate-500">· {s.count} tracked</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Frequently asked</h2>
          <div className="space-y-3">
            {faq.map((f) => (
              <div key={f.q} className="card p-4">
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.q}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">What&apos;s next</h2>
          <LaunchCrossLinks rocket={spec.name} location={live.nextLaunch?.location ?? live.sites[0]?.location ?? null} upcoming={!!live.nextLaunch} hide={['rocket']} />
        </section>

        {/* Related */}
        <section className="pt-6 border-t border-white/[0.06]">
          <h3 className="text-lg font-bold text-white mb-3">Go deeper</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <Link href="/guide/space-launch-cost-comparison" className="text-slate-300 hover:text-white">How much does it cost to launch a satellite? Every rocket compared &rarr;</Link>
            <Link href="/launch-vehicles" className="text-slate-300 hover:text-white">Launch vehicle database: compare all {allRocketSlugs().length}+ rockets &rarr;</Link>
            <Link href="/mission-control" className="text-slate-300 hover:text-white">Mission Control: live countdowns and streams &rarr;</Link>
            <Link href="/launch-cost-calculator" className="text-slate-300 hover:text-white">Launch cost calculator &rarr;</Link>
            {(entry.compare ?? []).map((c) => (
              <Link key={c} href={c} className="text-slate-300 hover:text-white">{c.replace('/compare/', '').split('-vs-').map((p) => p.replace(/-/g, ' ')).map((p) => p.replace(/\b\w/g, (ch) => ch.toUpperCase())).join(' vs ')} &rarr;</Link>
            ))}
          </div>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        }).replace(/</g, '\\u003c') }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Product', name: spec.name, brand: { '@type': 'Organization', name: spec.manufacturer },
          description: spec.description,
          ...(spec.costMillions ? { offers: { '@type': 'Offer', price: spec.costMillions * 1_000_000, priceCurrency: 'USD', description: 'Approximate dedicated launch price' } } : {}),
        }).replace(/</g, '\\u003c') }} />
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Rockets', href: '/rockets' }, { name: spec.name }]} />
      </div>
    </div>
  );
}
