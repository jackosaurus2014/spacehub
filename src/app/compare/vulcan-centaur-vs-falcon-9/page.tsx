import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { formatLaunchDate, missionTitle } from '@/components/launches/LaunchRow';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { LAUNCH_VEHICLES, type LaunchVehicle } from '@/lib/launch-vehicles-data';
import { getRocketLiveStats, type RocketLiveStats } from '@/lib/rockets';
import { LAUNCH_COST_AS_OF, LAUNCH_COST_SOURCE } from '@/lib/launch-cost-constants';

// Head-to-head for the two US medium/heavy workhorses. Every catalogue
// number is read from LAUNCH_VEHICLES at render time (never retyped), and
// the cadence block comes from the live SpaceEvent table, which is why the
// page renders per request. Metadata lives in layout.tsx (compare convention).
export const dynamic = 'force-dynamic';

const CANONICAL = 'https://spacenexus.us/compare/vulcan-centaur-vs-falcon-9';

function spec(id: string): LaunchVehicle {
  const v = LAUNCH_VEHICLES.find((x) => x.id === id);
  if (!v) throw new Error(`launch vehicle catalogue is missing '${id}'`);
  return v;
}

const kg = (n: number | null) => (n == null ? 'Not listed' : `${n.toLocaleString('en-US')} kg`);
const usdM = (n: number | null) => (n == null ? 'Not listed' : `~$${n}M`);
const perKg = (n: number | null) => (n == null ? 'Not listed' : `~$${n.toLocaleString('en-US')}/kg`);
const perKgFrom = (costMillions: number | null, payloadKg: number | null) =>
  costMillions == null || !payloadKg ? 'Not listed' : `~$${Math.round((costMillions * 1_000_000) / payloadKg).toLocaleString('en-US')}/kg`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function SpecTable({ rows, a, b }: { rows: Array<{ metric: string; a: string; b: string }>; a: string; b: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-xs sm:text-sm min-w-[520px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="py-2.5 px-3 sm:px-4 text-left text-[10px] uppercase tracking-widest font-semibold text-slate-500">Metric</th>
            <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] sm:text-xs font-bold text-white">{a}</th>
            <th className="py-2.5 px-3 sm:px-4 text-center text-[11px] sm:text-xs font-bold text-white">{b}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.metric} className={`border-b border-white/[0.06] last:border-0 ${i % 2 ? 'bg-white/[0.02]' : ''}`}>
              <td className="py-2 sm:py-2.5 px-3 sm:px-4 text-[11px] sm:text-xs font-medium text-slate-400">{r.metric}</td>
              <td className="py-2 sm:py-2.5 px-3 sm:px-4 text-center text-[11px] sm:text-xs text-white">{r.a}</td>
              <td className="py-2 sm:py-2.5 px-3 sm:px-4 text-center text-[11px] sm:text-xs text-white">{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CadenceCard({ name, slug, live }: { name: string; slug: string; live: RocketLiveStats }) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="font-semibold text-white">{name}</h3>
        <Link href={`/rockets/${slug}`} className="text-xs text-cyan-400 hover:text-cyan-300">Rocket page &rarr;</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Last 90 days" value={String(live.last90Days)} sub="launches flown" />
        <Stat label="Tracked flights" value={String(live.flown)} sub={`${live.completed} success · ${live.failed} failed`} />
        <Stat label="Tracked success rate" value={live.successRatePct != null ? `${live.successRatePct}%` : '—'} />
        <Stat label="Next launch" value={live.nextLaunch ? formatLaunchDate(live.nextLaunch.launchDate, false) : 'None scheduled'} sub={live.nextLaunch ? missionTitle(live.nextLaunch) : undefined} />
      </div>
      <p className="text-xs text-slate-500 mt-3">
        From SpaceNexus&apos;s launch tracker{live.trackedSince ? ` (tracked since ${formatLaunchDate(live.trackedSince, false)})` : ''}; {live.upcoming.length} on the manifest.
      </p>
    </div>
  );
}

export default async function VulcanVsFalcon9Page() {
  const f9 = spec('falcon-9');
  const vc = spec('vulcan-centaur');
  const now = new Date();
  const [f9Live, vcLive] = await Promise.all([getRocketLiveStats('falcon-9', now), getRocketLiveStats('vulcan-centaur', now)]);

  const glance = [
    { metric: 'Manufacturer', a: f9.manufacturer, b: vc.manufacturer },
    { metric: 'Status', a: f9.status, b: vc.status },
    { metric: 'First flight (this configuration)', a: f9.firstFlight, b: vc.firstFlight },
    { metric: 'Height', a: `${f9.heightM} m`, b: `${vc.heightM} m` },
    { metric: 'Core diameter', a: `${f9.diameterM} m`, b: `${vc.diameterM} m` },
    { metric: 'Fairing diameter', a: `${f9.fairingDiameterM} m`, b: `${vc.fairingDiameterM} m` },
    { metric: 'Liftoff mass', a: kg(f9.massKg), b: kg(vc.massKg) },
    { metric: 'Stages', a: String(f9.stages), b: String(vc.stages) },
  ];

  const performance = [
    { metric: 'Payload to LEO', a: kg(f9.payloadLeoKg), b: kg(vc.payloadLeoKg) },
    { metric: 'Payload to GTO', a: kg(f9.payloadGtoKg), b: kg(vc.payloadGtoKg) },
    { metric: 'Payload to SSO', a: kg(f9.payloadSsoKg), b: kg(vc.payloadSsoKg) },
    { metric: 'Payload to TLI (lunar)', a: kg(f9.payloadTliKg), b: kg(vc.payloadTliKg) },
    { metric: 'Engines', a: f9.engines, b: vc.engines },
    { metric: 'Propellant', a: f9.propellant, b: vc.propellant },
  ];

  const price = [
    { metric: 'List / catalogue price per launch', a: usdM(f9.costMillions), b: usdM(vc.costMillions) },
    { metric: 'Cost per kg to LEO (catalogue)', a: perKg(f9.costPerKgLeo), b: perKg(vc.costPerKgLeo) },
    { metric: 'Cost per kg to GTO (price ÷ GTO payload)', a: perKgFrom(f9.costMillions, f9.payloadGtoKg), b: perKgFrom(vc.costMillions, vc.payloadGtoKg) },
    { metric: 'Cost per kg to TLI (price ÷ TLI payload)', a: perKgFrom(f9.costMillions, f9.payloadTliKg), b: perKgFrom(vc.costMillions, vc.payloadTliKg) },
  ];

  const record = [
    { metric: 'Career launches', a: String(f9.totalLaunches), b: String(vc.totalLaunches) },
    { metric: 'Successes', a: String(f9.successes), b: String(vc.successes) },
    { metric: 'Failures', a: String(f9.failures), b: String(vc.failures) },
    { metric: 'Partial failures', a: String(f9.partialFailures), b: String(vc.partialFailures) },
    { metric: 'Success rate', a: `${f9.successRate}%`, b: `${vc.successRate}%` },
    { metric: 'Consecutive successes', a: String(f9.consecutiveSuccesses), b: String(vc.consecutiveSuccesses) },
    { metric: 'Record verified as of', a: f9.asOf ?? '—', b: vc.asOf ?? '—' },
  ];

  const reuse = [
    { metric: 'Reusable', a: f9.reusable ? 'Yes — first stage and fairings' : 'No', b: vc.reusable ? 'Yes' : 'No — expendable' },
    { metric: 'Booster engines', a: f9.engines.split('+')[0].trim(), b: vc.engines.split('+')[0].trim() },
    { metric: 'Upper stage', a: f9.engines.split('+')[1]?.trim() ?? '—', b: vc.engines.split('+')[1]?.trim() ?? '—' },
  ];

  const faq = [
    { q: 'Is Vulcan Centaur cheaper than Falcon 9?', a: `No. On the catalogue, Falcon 9 lists at about $${f9.costMillions}M and Vulcan Centaur at about $${vc.costMillions}M, and per kilogram to low Earth orbit Falcon 9 is about $${f9.costPerKgLeo?.toLocaleString('en-US')} against about $${vc.costPerKgLeo?.toLocaleString('en-US')} for Vulcan. Vulcan narrows the gap on high-energy orbits, where its hydrogen upper stage carries proportionally more.` },
    { q: 'Which rocket carries more?', a: `Vulcan Centaur on the catalogue figures: ${vc.payloadLeoKg.toLocaleString('en-US')} kg to LEO and ${kg(vc.payloadGtoKg)} to GTO against Falcon 9's ${f9.payloadLeoKg.toLocaleString('en-US')} kg and ${kg(f9.payloadGtoKg)}. Vulcan also carries a trans-lunar figure (${kg(vc.payloadTliKg)}); the catalogue lists none for Falcon 9. Falcon 9's LEO figure assumes an expendable booster — the routine reusable configuration carries less.` },
    { q: 'Which is more reliable?', a: `Both have a perfect or near-perfect record on the catalogue: Falcon 9 at ${f9.successRate}% over ${f9.totalLaunches} launches, Vulcan at ${vc.successRate}% over ${vc.totalLaunches}. The difference is sample size — Falcon 9's record spans hundreds of flights, Vulcan's a handful, and the catalogue description notes two Vulcan flights with solid-rocket-booster anomalies that still reached orbit.` },
    { q: 'Is Vulcan Centaur reusable?', a: 'No. Vulcan is expendable; Falcon 9 recovers and reflies its first stage and fairings, which is the structural reason for the price gap and for the cadence difference in the live figures on this page.' },
    { q: 'Which missions fly on Vulcan rather than Falcon 9?', a: "Vulcan was designed for US national-security launches and carries a hydrogen upper stage suited to high-energy orbits; Amazon's Leo (Kuiper) constellation is among its commercial customers. Falcon 9 flies most of everything else — Starlink, commercial satellites, rideshares, NASA cargo and crew. Live cadence for each is on this page; the vehicle pages carry the manifests." },
  ];

  const verdict = [
    ['LEO constellations and rideshare', `Falcon 9. Lowest catalogue cost per kilogram (${perKg(f9.costPerKgLeo)}), the highest cadence, and a rideshare programme that sells slots by the kilogram.`],
    ['Geostationary communications satellites', `Either. Falcon 9 is the cheaper ride per launch; Vulcan carries more to GTO on the catalogue (${kg(vc.payloadGtoKg)} vs ${kg(f9.payloadGtoKg)}), which matters for the heaviest buses or a higher-energy drop-off.`],
    ['Lunar and high-energy missions', `Vulcan on paper: the catalogue gives it ${kg(vc.payloadTliKg)} to trans-lunar injection and lists no TLI figure for Falcon 9, whose lunar payloads have been the smaller commercial landers. Falcon Heavy is SpaceX's answer at this energy.`],
    ['National-security launches', "Both are in the market; Vulcan was designed for it. Read the catalogue description above for Vulcan's current status — this page does not editorialise beyond it."],
    ['Crew', 'Falcon 9 only: Dragon flies on it. Vulcan has no crew vehicle in service.'],
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <nav className="text-xs text-zinc-500 mb-4">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-white">Compare</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">Vulcan Centaur vs Falcon 9</span>
      </nav>
      <h1 className="text-display text-3xl md:text-4xl mb-3">Vulcan Centaur vs Falcon 9</h1>
      <p className="text-base max-w-2xl mb-8 text-slate-300">
        ULA&apos;s expendable next-generation rocket against SpaceX&apos;s reusable workhorse: list price and
        cost per kilogram, payload to every orbit that matters, career record, live launch cadence, and
        which missions fly on which. Catalogue figures are read from the SpaceNexus launch-vehicle
        registry; cadence is live from the launch tracker.
      </p>

      {/* At a glance */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">At a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Falcon 9 list price" value={usdM(f9.costMillions)} sub={`${perKg(f9.costPerKgLeo)} to LEO`} />
          <Stat label="Vulcan catalogue price" value={usdM(vc.costMillions)} sub={`${perKg(vc.costPerKgLeo)} to LEO`} />
          <Stat label="Falcon 9 record" value={`${f9.successRate}%`} sub={`${f9.totalLaunches} launches`} />
          <Stat label="Vulcan record" value={`${vc.successRate}%`} sub={`${vc.totalLaunches} launches`} />
        </div>
        <SpecTable rows={glance} a={f9.name} b={vc.name} />
      </section>

      {/* Performance */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Performance</h2>
        <SpecTable rows={performance} a={f9.name} b={vc.name} />
        <p className="text-sm text-slate-400 leading-relaxed mt-4">
          Vulcan Centaur out-lifts Falcon 9 to every orbit the catalogue lists for both, and the gap widens
          with orbital energy: the hydrogen-fuelled Centaur upper stage is the reason Vulcan carries a
          trans-lunar figure while the catalogue lists none for Falcon 9. Falcon 9&apos;s LEO number is
          the expendable-booster maximum; the reusable configuration it flies almost every mission in
          gives up some of that to land the first stage.
        </p>
      </section>

      {/* Price */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Price and cost per kilogram</h2>
        <SpecTable rows={price} a={f9.name} b={vc.name} />
        <p className="text-sm text-slate-400 leading-relaxed mt-4">
          Per launch, Vulcan&apos;s catalogue price is higher, and per kilogram to LEO Falcon 9 is the
          cheaper ride by a clear margin. The per-kilogram gap narrows on GTO and disappears as a
          meaningful comparison at TLI, where only Vulcan carries a catalogue figure. Both are catalogue
          or list figures; government missions carry mission-assurance costs above them.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Figures as of {LAUNCH_COST_AS_OF}. Source: {LAUNCH_COST_SOURCE}. Full context in the{' '}
          <Link href="/guide/space-launch-cost-comparison" className="text-cyan-400 hover:text-cyan-300">launch cost guide</Link>.
        </p>
      </section>

      {/* Reliability and cadence */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Reliability and cadence</h2>
        <SpecTable rows={record} a={f9.name} b={vc.name} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <CadenceCard name={f9.name} slug="falcon-9" live={f9Live} />
          <CadenceCard name={vc.name} slug="vulcan-centaur" live={vcLive} />
        </div>
        <div className="card p-5 mt-4">
          <h3 className="font-semibold text-white text-sm mb-2">Vulcan Centaur, from the vehicle catalogue</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{vc.description}</p>
        </div>
        <div className="card p-5 mt-3">
          <h3 className="font-semibold text-white text-sm mb-2">Falcon 9, from the vehicle catalogue</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{f9.description}</p>
        </div>
      </section>

      {/* Reusability */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Reusability</h2>
        <SpecTable rows={reuse} a={f9.name} b={vc.name} />
        <p className="text-sm text-slate-400 leading-relaxed mt-4">
          This is the structural difference behind every other row. Falcon 9 lands and reflies its first
          stage and recovers its fairings, so most of the vehicle&apos;s cost is amortised across many
          flights and the same hardware can fly again within weeks — which is what the cadence figures
          above show. Vulcan is expended every flight: a new pair of BE-4 engines, a new Centaur, and new
          solid boosters each time. ULA has talked publicly about recovering the engine section in
          future; nothing in the catalogue reflects it yet.
        </p>
      </section>

      {/* Who flies on which */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Who flies on which</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-2">{f9.name}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Almost everything: SpaceX&apos;s own Starlink batches, commercial geostationary and LEO
              satellites, Transporter and Bandwagon rideshares, NASA cargo and crew to the space station,
              and a share of national-security missions. The volume is why its per-launch economics are
              what they are.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-2">{vc.name}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Built for US national-security launches, where its high-energy upper stage and
              mission-assurance pedigree are the product, plus commercial work anchored by Amazon&apos;s
              Leo (Kuiper) constellation, which bought Vulcan launches in bulk. Cadence is set by how many
              of those missions are ready in a given year, not by a backlog of its own payloads.
            </p>
          </div>
        </div>
      </section>

      {/* Verdict */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Verdict by mission type</h2>
        <div className="space-y-3">
          {verdict.map(([k, v]) => (
            <div key={k} className="card p-4">
              <div className="text-sm font-semibold text-white mb-1">{k}</div>
              <p className="text-sm text-slate-400 leading-relaxed">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mb-10">
        <h2 className="text-display text-xl mb-3">Frequently asked</h2>
        <div className="space-y-3">
          {faq.map((f) => (
            <div key={f.q} className="card p-4">
              <h3 className="text-sm font-semibold text-white mb-1.5">{f.q}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section className="pt-6 border-t border-white/[0.06] text-sm mb-6">
        <h3 className="text-lg font-bold text-white mb-3">Go deeper</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link href="/rockets/falcon-9" className="text-slate-300 hover:text-white">Falcon 9: live schedule, specs and record &rarr;</Link>
          <Link href="/rockets/vulcan-centaur" className="text-slate-300 hover:text-white">Vulcan Centaur: live schedule, specs and record &rarr;</Link>
          <Link href="/compare/spacex-vs-ula" className="text-slate-300 hover:text-white">SpaceX vs ULA: the companies &rarr;</Link>
          <Link href="/guide/space-launch-cost-comparison" className="text-slate-300 hover:text-white">Launch cost comparison: every rocket &rarr;</Link>
          <Link href="/guide/cost-to-launch/geo-comsat" className="text-slate-300 hover:text-white">Cost to launch a GEO comsat &rarr;</Link>
          <Link href="/compare/launch-vehicles" className="text-slate-300 hover:text-white">Interactive launch-vehicle comparison &rarr;</Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: 'Vulcan Centaur vs Falcon 9: Cost, Payload, Reliability, Cadence',
        description: 'ULA Vulcan Centaur vs SpaceX Falcon 9 side by side: price, cost per kilogram, payload, reliability and live cadence.',
        author: { '@type': 'Organization', name: 'SpaceNexus' },
        publisher: { '@type': 'Organization', name: 'SpaceNexus', url: 'https://spacenexus.us' },
        datePublished: '2026-09-01', dateModified: new Date().toISOString().slice(0, 10),
        url: CANONICAL,
      }).replace(/</g, '\\u003c') }} />
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Vulcan Centaur vs Falcon 9' }]} />

      <RelatedModules modules={PAGE_RELATIONS['compare/vulcan-centaur-vs-falcon-9']} />
    </div>
  );
}
