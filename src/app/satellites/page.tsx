/**
 * /satellites — SERVER component (same rework as /news, /mission-control,
 * /company-profiles). The page used to be 'use client' end to end: the raw
 * HTML served a zeroed stats bar ("0 Tracked / 0 LEO ...") and a "Loading
 * Satellite Data" placeholder to every crawler and no-JS client. The first
 * screen — h1, real catalog totals from the daily SATCAT snapshot, and a
 * curated list of notable tracked objects — is now real HTML. The live map
 * keeps every interactive affordance in the client island below.
 *
 * Two data classes, labeled honestly, never blended (same doctrine as
 * /how-many-satellites):
 *  - Catalog totals — DebrisStats via getSatelliteTotals() (public SATCAT,
 *    daily snapshot), rendered here with its own provenance stamp.
 *  - Live positions — CelesTrak TLEs propagated client-side. That cache is
 *    in-memory inside /api/satellites/tle and CelesTrak is rate-limited, so
 *    the server deliberately does NOT fetch TLEs; the island keeps its own
 *    "positions propagated live" provenance stamp.
 *
 * force-dynamic, never ISR: Prisma reads at request time and the Railway
 * build container has no database. The DB read degrades to an honest
 * "totals unavailable" line — blank beats invented.
 */

import Link from 'next/link';
import Provenance from '@/components/ui/Provenance';
import Telemetry from '@/components/ui/Telemetry';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { getSatelliteTotals, type SatelliteTotals } from '@/lib/satellite-counts';
import { logger } from '@/lib/logger';
import { SITE_STATS } from '@/lib/site-stats';
import SatellitesClient from './SatellitesClient';
import { NOTABLE_OBJECTS, ORBIT_COLORS } from './shared';

export const dynamic = 'force-dynamic';

export default async function SatellitesPage() {
  let totals: SatelliteTotals | null = null;
  try {
    // Returns null (never throws) when the DB is unreachable; the belt and
    // suspenders here guard the unstable_cache wrapper itself.
    totals = await getSatelliteTotals();
  } catch (error) {
    logger.warn('satellites: server-side catalog totals failed; rendering without them', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Satellite Tracker', href: '/satellites' },
      ]} />
      <FAQSchema items={[
        { question: 'How accurate is SpaceNexus satellite tracking?', answer: 'SpaceNexus uses NORAD Two-Line Element (TLE) data updated multiple times per day, providing positional accuracy within a few kilometers for most active satellites in LEO, MEO, and GEO orbits.' },
        { question: 'Can I track the International Space Station in real-time?', answer: 'Yes. The live tracker map on this page shows the ISS position — latitude, longitude, altitude, and velocity — updated every 30 seconds using live orbital data.' },
        { question: 'How many satellites are currently in orbit?', answer: `As of 2026, there are ${SITE_STATS.satellites} active satellites in orbit, with the majority in Low Earth Orbit (LEO). SpaceNexus tracks satellites across LEO, MEO, GEO, and HEO orbits.` },
        { question: 'What is the difference between LEO, MEO, and GEO orbits?', answer: 'LEO (Low Earth Orbit) is 160-2,000 km altitude, used for imaging and broadband. MEO (Medium Earth Orbit) is 2,000-35,786 km, used for navigation like GPS. GEO (Geostationary Orbit) is approximately 35,786 km, used for communications and weather satellites.' },
      ]} />

      <div className="container mx-auto px-4 pt-8">
        {/* ── Header — server-rendered, crawlable ─────────────────────── */}
        <header className="mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Live Satellite Tracker</h1>
          <p className="text-lg text-white/70 max-w-3xl">
            Track satellites in real-time across all orbital regimes with live TLE-based position
            propagation — and see what the public catalog holds, from the ISS down to debris fragments.
          </p>
        </header>

        {/* Breadcrumb nav */}
        <nav className="mb-6 text-sm text-slate-400" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-slate-300">Satellite Tracker</li>
          </ol>
        </nav>

        {/* ── Catalog stats — daily SATCAT snapshot, server-rendered ──── */}
        {totals ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-2">
              <Telemetry label="Tracked objects" value={totals.totalTracked.toLocaleString()} sub="everything in the catalog" />
              <Telemetry label="Payloads" value={totals.totalPayloads.toLocaleString()} sub="working + defunct" />
              <Telemetry label="Debris" value={totals.totalDebris.toLocaleString()} sub="tracked fragments" tone="ember" />
              <Telemetry label="LEO" value={totals.leo.toLocaleString()} sub="low Earth orbit" />
              <Telemetry label="MEO" value={totals.meo.toLocaleString()} sub="navigation belt" />
              <Telemetry label="GEO" value={totals.geo.toLocaleString()} sub="geostationary arc" />
            </div>
            <Provenance
              source="public SATCAT (CelesTrak), daily snapshot"
              asOf={totals.asOf}
              dateOnly
              className="mb-6"
            />
          </>
        ) : (
          <p className="font-mono text-[11px] leading-snug text-slate-500 mb-6">
            Catalog totals unavailable — the daily SATCAT snapshot could not be read. The live map
            below loads its own data independently.
          </p>
        )}

        {/* ── Notable objects — curated, crawlable ────────────────────── */}
        <section className="mb-8" aria-labelledby="notable-objects-heading">
          <h2 id="notable-objects-heading" className="text-lg font-semibold text-white mb-3">
            Notable objects in the catalog
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NOTABLE_OBJECTS.map((obj) => (
              <li
                key={obj.noradId}
                className="flex items-start justify-between gap-3 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-white">{obj.name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500">NORAD {obj.noradId}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{obj.role}</p>
                </div>
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded text-xs font-bold whitespace-nowrap"
                  style={{ backgroundColor: ORBIT_COLORS[obj.orbitClass] + '20', color: ORBIT_COLORS[obj.orbitClass] }}
                >
                  {obj.orbitClass} · {obj.altitude}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            Curated highlights — live positions for these and the rest of the tracked set load on the
            interactive map below.
          </p>
        </section>
      </div>

      {/* Live map, search, featured satellites and everything interactive */}
      <SatellitesClient />
    </>
  );
}
