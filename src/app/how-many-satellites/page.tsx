import type { Metadata } from 'next';
import Link from 'next/link';
import Console from '@/components/ui/Console';
import Telemetry from '@/components/ui/Telemetry';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';
import CiteEmbed from '@/components/CiteEmbed';
import { getSatelliteTotals, CONSTELLATION_COUNTS, CONSTELLATION_COUNTS_AS_OF } from '@/lib/satellite-counts';

// G11 — the answer page for the "how many satellites are in orbit" query
// class. Live SATCAT totals daily + curated constellation counts with
// explicit vintages — the two data classes are labeled, never blended.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'How Many Satellites Are in Orbit? Live Count',
  description: 'Live count of objects in Earth orbit from the public satellite catalog — payloads, rocket bodies and debris by orbit — plus verified constellation counts for Starlink, OneWeb and Amazon Leo.',
  alternates: { canonical: 'https://spacenexus.us/how-many-satellites' },
};

export default async function HowManySatellitesPage() {
  const t = await getSatelliteTotals();
  const orbitMax = t ? Math.max(1, t.leo, t.meo, t.geo) : 1;
  const faq = t ? [
    { question: 'How many satellites are in orbit right now?', answer: `As of ${new Date(t.asOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}, the public satellite catalog tracks ${t.totalTracked.toLocaleString()} objects in Earth orbit, of which ${t.totalPayloads.toLocaleString()} are payloads (working or defunct satellites). The rest are rocket bodies (${t.totalRocketBodies.toLocaleString()}) and debris fragments (${t.totalDebris.toLocaleString()}).` },
    { question: 'How many Starlink satellites are in orbit?', answer: `${CONSTELLATION_COUNTS[0].satellites.toLocaleString()} as of ${CONSTELLATION_COUNTS[0].countDate} — the largest constellation ever flown, with ~11,087 working.` },
    { question: 'How many satellites are in LEO vs GEO?', answer: `Low Earth orbit holds ${t.leo.toLocaleString()} tracked objects, medium Earth orbit ${t.meo.toLocaleString()}, and geostationary orbit ${t.geo.toLocaleString()}.` },
  ] : [];

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span><span className="text-slate-400">How Many Satellites</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">How many satellites are in orbit?</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Counted from the public satellite catalog every morning — not a static factoid page. Two kinds of numbers
            below, labeled: <span className="text-white/90">live totals</span> (refreshed daily) and{' '}
            <span className="text-white/90">constellation counts</span> (verified against primary tracking sources, with dates).
          </p>
        </header>

        {!t ? (
          <div className="card p-6"><p className="text-slate-400 text-sm">The daily catalog snapshot is temporarily unavailable.</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Telemetry label="Tracked objects" value={t.totalTracked.toLocaleString()} sub="everything in the catalog" />
              <Telemetry label="Payloads" value={t.totalPayloads.toLocaleString()} sub="satellites, working + defunct" />
              <Telemetry label="Rocket bodies" value={t.totalRocketBodies.toLocaleString()} sub="spent stages" tone="ink" />
              <Telemetry label="Debris fragments" value={t.totalDebris.toLocaleString()} sub="tracked junk" tone="ember" />
            </div>

            <Console title="By orbit" source="Public SATCAT (CelesTrak), daily snapshot" asOf={t.asOf} status="verified">
              <ul className="space-y-2">
                {[{ k: 'Low Earth orbit (LEO)', v: t.leo }, { k: 'Medium Earth orbit (MEO)', v: t.meo }, { k: 'Geostationary (GEO)', v: t.geo }].map(row => (
                  <li key={row.k} className="text-sm">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white/90">{row.k}</span>
                      <span className="font-mono tabular-nums text-slate-300">{row.v.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded bg-white/[0.04] overflow-hidden">
                      <div className="h-full bg-cyan-500/60 rounded" style={{ width: `${Math.round((row.v / orbitMax) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Console>

            <Console title="The big constellations" source={`Verified against primary tracking sources · curated ${CONSTELLATION_COUNTS_AS_OF}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Verified satellite counts for the largest constellations</caption>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                      <th className="py-2 pr-3">Constellation</th>
                      <th className="py-2 pr-3">Operator</th>
                      <th className="py-2 pr-3 text-right">In orbit</th>
                      <th className="py-2 text-right">As of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CONSTELLATION_COUNTS.map(c => (
                      <tr key={c.name} className="border-b border-white/[0.04]">
                        <td className="py-2 pr-3 text-white/90">{c.name}<p className="text-xs text-slate-500 mt-0.5 max-w-md">{c.note}</p></td>
                        <td className="py-2 pr-3 text-slate-400 align-top">{c.operator}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-white align-top">{c.approx ? '~' : ''}{c.satellites.toLocaleString()}</td>
                        <td className="py-2 text-right align-top"><a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">{c.countDate} ↗</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Console>

            <CiteEmbed
              title="How Many Satellites Are in Orbit"
              pageUrl="https://spacenexus.us/how-many-satellites"
              sourceLine="SpaceNexus satellite census (public SATCAT daily snapshot + verified constellation counts)"
            />

            <p className="text-sm text-slate-500">
              Go deeper: <Link href="/satellites" className="text-cyan-300 hover:underline">live satellite tracker</Link>{' · '}
              <Link href="/space-environment?tab=debris" className="text-cyan-300 hover:underline">debris environment</Link>{' · '}
              <Link href="/constellations" className="text-cyan-300 hover:underline">constellation intel</Link>
            </p>
          </div>
        )}
        {faq.length > 0 && <FAQSchema items={faq} />}
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'How Many Satellites' }]} />
        <DatasetSchema
          name="SpaceNexus Satellites in Orbit — daily catalog count"
          description="Daily count of tracked objects in Earth orbit from the public satellite catalog (SATCAT): payloads, rocket bodies and debris, split by LEO, MEO and GEO, plus curated constellation counts for Starlink, OneWeb and Amazon Leo with explicit count dates."
          url="https://spacenexus.us/how-many-satellites"
          temporalCoverage={t ? `${t.asOf.slice(0, 10)}/${t.asOf.slice(0, 10)}` : undefined}
          dateModified={t?.asOf}
          keywords={['satellites in orbit', 'satellite count', 'space debris', 'SATCAT', 'Starlink']}
        />
      </div>
    </div>
  );
}
