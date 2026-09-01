import type { Metadata } from 'next';
import Link from 'next/link';
import HeroArt from '@/components/ui/HeroArt';
import ScrollReveal from '@/components/ui/ScrollReveal';
import GuideNavigation from '@/components/guide/GuideNavigation';
import ReadingTime from '@/components/ui/ReadingTime';
import RelatedModules from '@/components/ui/RelatedModules';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// Consolidates the three March 2026 space-weather posts into one operator
// playbook. Thresholds and scales are the ones our own dashboard uses
// (NOAA SWPC planetary Kp, DONKI flare / storm / CME feeds). No DB reads.
export const revalidate = 3600;

const TITLE = 'Space Weather Risk for Satellite Operators: Kp, Flares, CMEs and What to Do';
const DESCRIPTION =
  'An operator\'s guide to space weather: what Kp, Bz and the G-scale mean, flare classes, how storms inflate drag on LEO satellites, single-event upsets and charging, the February 2022 Starlink loss, and a step-by-step operational playbook.';
const OG = `/api/og?title=${encodeURIComponent('Space Weather Risk for Satellite Operators')}&subtitle=${encodeURIComponent('Kp, flares, CMEs and what to do')}&type=guide`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['space weather satellite operators', 'kp index explained', 'geomagnetic storm satellite drag', 'solar flare classes', 'cme satellite impact', 'single event upset', 'starlink geomagnetic storm 2022', 'space weather playbook'],
  alternates: { canonical: 'https://spacenexus.us/guide/space-weather-risk-for-operators' },
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'article', publishedTime: '2026-09-01T00:00:00Z', modifiedTime: '2026-09-01T00:00:00Z', authors: ['SpaceNexus'], images: [{ url: OG, width: 1200, height: 630 }] },
};

const TOC = [
  { id: 'verdict', label: 'The short answer' },
  { id: 'what', label: 'What space weather is: flares, CMEs, solar wind' },
  { id: 'indices', label: 'Reading the indices: Kp, G-scale, Bz, Dst' },
  { id: 'flares', label: 'Flare classes and what each one does' },
  { id: 'drag', label: 'Drag: the LEO killer' },
  { id: 'particles', label: 'SEUs, charging and radiation damage' },
  { id: 'starlink', label: 'Case study: February 2022' },
  { id: 'forecast', label: 'How much warning you get' },
  { id: 'playbook', label: 'The operational playbook' },
  { id: 'faq', label: 'FAQ' },
  { id: 'sources', label: 'Sources' },
];

const FAQ = [
  { q: 'What Kp level should trigger action for a satellite operator?', a: 'Our monitoring guidance sets the first alert at Kp 5 (a G1 minor storm): raise monitoring cadence, postpone non-essential manoeuvres and review telemetry for anomalies. At Kp 7 and above (G3 strong or worse) consider safe mode for vulnerable spacecraft, suspend LEO orbit determination because atmospheric density models become unreliable, and prepare for GPS degradation on the ground.' },
  { q: 'What is the difference between a solar flare and a CME?', a: 'A flare is a burst of electromagnetic radiation — X-rays, ultraviolet, radio — that travels at light speed and reaches Earth in about 8 minutes, with no warning. A coronal mass ejection is a cloud of magnetised plasma, billions of tonnes of it, travelling at roughly 250-3,000 km/s and arriving 15-72 hours later. Flares cause radio blackouts and immediate ionospheric effects; CMEs drive the geomagnetic storms that inflate drag and induce currents.' },
  { q: 'Why does a geomagnetic storm make satellites fall?', a: 'Storm energy heats the upper atmosphere, which expands upward. A satellite that was flying through near-vacuum is suddenly in measurably denser air, drag rises, and its orbit decays faster than planned. For a satellite at operational altitude that means extra fuel; for one still at a low deployment orbit it can mean reentry before it can climb, which is what happened to Starlink in February 2022.' },
  { q: 'What happened to Starlink in February 2022?', a: 'On February 4, 2022 SpaceX launched 49 Starlink satellites into a geomagnetic storm. Increased atmospheric drag at their low deployment orbit caused 40 of them to reenter and burn up before they could raise their orbits — a loss our coverage estimated at around $50 million. Operators with space weather alerts configured could have seen the risk.' },
  { q: 'What is a single-event upset?', a: 'A bit flip or latch-up in spacecraft electronics caused by a single energetic particle — typically a solar energetic proton or cosmic ray — passing through a memory cell or transistor. Most are recoverable with error correction or a reset; a latch-up can destroy a component. Solar proton events raise the rate sharply, which is why operators avoid software uploads and power down sensitive instruments during them.' },
  { q: 'Where does SpaceNexus get its space weather data?', a: 'From NOAA\'s Space Weather Prediction Center (the planetary Kp feed and forecasts) and NASA\'s DONKI catalogue of flares, geomagnetic storms and coronal mass ejections, with real-time solar wind measurements from the DSCOVR spacecraft at the L1 point. The live dashboard is at /space-weather.' },
];

export default function SpaceWeatherRiskGuide() {
  const now = new Date();

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
            <Link href="/guide" className="hover:text-white/80">Guides</Link><span>/</span>
            <span className="text-slate-400">Space Weather Risk for Operators</span>
          </nav>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{TITLE}</h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Space weather is the leading cause of satellite anomalies outside manufacturing defects, and the Sun is near the peak of an unusually active cycle. This guide is the operator&apos;s version: what the indices mean, which physical mechanisms actually damage or deorbit spacecraft, how much warning you get, and what to do at each threshold.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span>Updated: {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
              <span>|</span>
              <span>By SpaceNexus Team</span>
              <span>|</span>
              <ReadingTime wordCount={2300} className="flex items-center gap-1.5" />
            </div>
          </header>
          <HeroArt src="/art/hero-space-environment.png" className="mb-8" />

          <nav className="card p-6 mb-10">
            <h2 className="text-lg font-bold text-white mb-3">In this guide</h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {TOC.map((item, i) => (
                <li key={item.id}><a href={`#${item.id}`} className="text-slate-300 hover:text-white text-sm transition-colors">{i + 1}. {item.label}</a></li>
              ))}
            </ol>
          </nav>

          <ScrollReveal delay={0.1}>
            <article className="card p-8 space-y-10">
              <section id="verdict">
                <h2 className="text-2xl font-bold text-white mb-4">The short answer</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Four things hurt satellites: <strong className="text-slate-300">drag</strong> (storm-heated atmosphere expands and slows anything in low orbit), <strong className="text-slate-300">single-event effects</strong> (energetic particles flipping bits and latching up electronics), <strong className="text-slate-300">charging</strong> (surface and deep-dielectric charge building up until it arcs), and <strong className="text-slate-300">cumulative radiation damage</strong> to solar arrays, optics and semiconductors. On the ground, the same storms degrade GPS, black out HF radio and induce currents in power grids — which matters to you because your customers and your ground segment depend on all three.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Watch three numbers: <strong className="text-slate-300">Kp</strong> (0-9; storm at 5, act decisively at 7), <strong className="text-slate-300">Bz</strong> (the interplanetary magnetic field&apos;s north-south component; strongly negative means the storm will be worse), and <strong className="text-slate-300">X-ray flux</strong> (flare class; M and X deserve attention). Flares arrive with no warning; CMEs give you one to three days; the DSCOVR spacecraft at L1 gives a final 15-60 minute confirmation of what is about to hit. Build the response into your concept of operations before the storm, not during it. The <Link href="/space-weather" className="text-cyan-400 hover:text-cyan-300">live dashboard</Link> carries the current values.
                </p>
              </section>

              <section id="what">
                <h2 className="text-2xl font-bold text-white mb-4">What space weather is: flares, CMEs, solar wind</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The Sun&apos;s surface is a plasma threaded with magnetic field lines that constantly emerge, tangle and reconnect. When a magnetic structure becomes unstable it releases energy, and that energy reaches Earth in three forms. A <strong className="text-slate-300">solar flare</strong> is a burst of electromagnetic radiation across the spectrum — radio through X-rays and gamma rays — travelling at light speed and arriving about 8 minutes after it leaves the Sun. A <strong className="text-slate-300">coronal mass ejection</strong> is a cloud of magnetised plasma, billions of tonnes of solar material, launched at roughly 250-3,000 km/s and arriving 15-72 hours later if it is aimed at Earth. And the <strong className="text-slate-300">solar wind</strong> is the continuous flow of charged particles — normally 300-400 km/s — with high-speed streams from coronal holes that can disturb the magnetosphere on their own.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Flares and CMEs also accelerate <strong className="text-slate-300">solar energetic particles</strong> — high-energy protons and ions — that arrive within minutes to hours. These are the particles that penetrate shielding and cause single-event upsets, and they are the reason a big flare matters to a spacecraft even when the CME misses.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  A <strong className="text-slate-300">geomagnetic storm</strong> is what happens when a CME or fast stream reaches Earth&apos;s magnetosphere. If the CME&apos;s embedded magnetic field points south — opposite Earth&apos;s — it reconnects with the planet&apos;s field, opening the magnetosphere and letting solar-wind energy pour in. That is why Bz, the north-south field component, is the most important single predictor of storm severity, and why two CMEs of similar speed can produce very different storms. The Sun runs on an approximately 11-year cycle; Solar Cycle 25 began in December 2019, has run well above forecast, and is near its 2024-2026 peak — the May 2024 G5 superstorm, the strongest in more than two decades, showed what this cycle can do.
                </p>
              </section>

              <section id="indices">
                <h2 className="text-2xl font-bold text-white mb-4">Reading the indices: Kp, G-scale, Bz, Dst</h2>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                        <th className="px-3 py-2.5">Kp</th><th className="px-3 py-2.5">NOAA scale</th><th className="px-3 py-2.5">Effects</th><th className="px-3 py-2.5">Operator posture</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5">0-3</td><td className="px-3 py-2.5">Quiet</td><td className="px-3 py-2.5 text-slate-400">Background</td><td className="px-3 py-2.5">Normal operations</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5">4</td><td className="px-3 py-2.5">Unsettled</td><td className="px-3 py-2.5 text-slate-400">Minor field disturbance</td><td className="px-3 py-2.5">Watch the forecast</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5">5</td><td className="px-3 py-2.5">G1 Minor</td><td className="px-3 py-2.5 text-slate-400">Weak grid fluctuations, minor satellite orientation effects, aurora at high latitudes</td><td className="px-3 py-2.5">First alert: raise monitoring cadence</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5">6</td><td className="px-3 py-2.5">G2 Moderate</td><td className="px-3 py-2.5 text-slate-400">HF fade-outs at high latitude, voltage corrections needed</td><td className="px-3 py-2.5">Postpone non-essential manoeuvres</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5">7</td><td className="px-3 py-2.5">G3 Strong</td><td className="px-3 py-2.5 text-slate-400">Intermittent HF, GPS degradation, drag increase, aurora at mid-latitudes</td><td className="px-3 py-2.5">Safe mode for vulnerable spacecraft; suspend LEO orbit determination</td></tr>
                      <tr className="border-b border-white/[0.06]"><td className="px-3 py-2.5">8</td><td className="px-3 py-2.5">G4 Severe</td><td className="px-3 py-2.5 text-slate-400">HF blackout for hours, GPS degraded for hours, widespread voltage problems</td><td className="px-3 py-2.5">Full storm posture; expect anomalies</td></tr>
                      <tr><td className="px-3 py-2.5">9</td><td className="px-3 py-2.5">G5 Extreme</td><td className="px-3 py-2.5 text-slate-400">Possible grid collapse, HF out for days, GPS unusable, satellite damage risk, aurora near the equator</td><td className="px-3 py-2.5">Everything shielded that can be; recovery planning</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Kp</strong> is the planetary geomagnetic index: a 0-9 scale computed every three hours from magnetometers around the world, and the number NOAA&apos;s G-scale maps onto. Our dashboard reads it straight from NOAA SWPC&apos;s planetary K-index feed. Kp 5 and above is a storm by definition; our monitoring guidance sets the first automated alert there and the decisive-action threshold at Kp 7.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Bz</strong> is the north-south component of the interplanetary magnetic field measured in the solar wind upstream of Earth, in nanotesla. When it turns strongly southward — below about −10 nT — coupling to the magnetosphere increases sharply and the coming storm will be worse than the CME&apos;s speed alone suggests. Kp tells you what has happened; Bz at L1 tells you what is about to.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Dst</strong> (disturbance storm time) is the complementary index: a measure, in nanotesla, of how much the ring current circling Earth during a storm depresses the equatorial magnetic field. Where Kp is coarse and three-hourly, Dst is hourly and captures the depth and recovery of a storm — a strongly negative Dst means an intense main phase, and the slow return toward zero over the following days is the recovery phase during which drag stays elevated. Operators concerned with drag and with radiation-belt enhancement watch Dst alongside Kp. Solar wind speed (above roughly 500-600 km/s indicates a disturbance) and proton flux (an elevated count means a solar energetic particle event is under way) complete the set.
                </p>
              </section>

              <section id="flares">
                <h2 className="text-2xl font-bold text-white mb-4">Flare classes and what each one does</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Flares are classified by peak soft X-ray brightness, measured by the GOES satellites, on a logarithmic letter scale: <strong className="text-slate-300">A, B, C, M, X</strong>, each ten times the last, with a number for finer gradation (an X10 flare is ten times an X1). Background is A or B class.
                </p>
                <ul className="space-y-3 text-slate-400 leading-relaxed mb-4">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">A, B, C</strong> — minor; minimal Earth effects. C-class flares are routine near solar maximum.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">M</strong> — moderate; brief radio blackouts at high latitudes, minor satellite effects. M1 and above can affect HF communications; our guidance flags M-class as the level that warrants attention.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">X</strong> — major; widespread HF radio blackouts on the sunlit side lasting minutes to hours, satellite anomalies and GPS degradation. Flares above X10 are treated as extreme events.</span></li>
                </ul>
                <p className="text-slate-400 leading-relaxed">
                  Because flare radiation arrives at light speed, there is no lead time: detection and effect are simultaneous. What a flare does to a spacecraft directly is modest — a brief increase in ultraviolet heating of the upper atmosphere and, for spacecraft with sensitive detectors, saturation. What matters operationally is what the flare tells you: a large flare from an Earth-facing active region is often accompanied by a CME and an energetic particle event, which is your cue to start preparing for the storm one to three days out.
                </p>
              </section>

              <section id="drag">
                <h2 className="text-2xl font-bold text-white mb-4">Drag: the LEO killer</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  For anyone flying in low Earth orbit, atmospheric drag is the space weather effect that costs the most money. Geomagnetic storm energy is deposited in the thermosphere, which heats and expands upward; density at a given altitude can rise sharply within hours. A satellite that was decaying on a predictable schedule suddenly decays faster, its ground track shifts, and the orbit determination models the operator uses to predict where it will be — and to screen for conjunctions — become unreliable. That is why our operational guidance says to suspend LEO orbit determination at Kp 7 and above: the atmospheric density model behind it is no longer trustworthy.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The consequences scale with altitude and with margin. At operational altitude, a storm means extra station-keeping fuel and a temporarily degraded conjunction picture. At a low deployment or checkout orbit, a storm can be fatal: a satellite that needs days of electric-propulsion thrusting to climb to its working altitude may not out-run the decay. Companies flying large constellations have responded with internal models to predict storm drag on their fleets, and a growing part of the value of space weather forecasting is precisely this — knowing whether to hold a launch.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Drag also has an upside for the debris environment: storms clear low orbits faster. But for the operator it is a cost and a risk, and the mitigation is planning — launch windows checked against the forecast, deployment altitudes chosen with storm margin, and propellant reserves that assume a bad week. Our <Link href="/guide/space-debris-and-traffic-management" className="text-cyan-400 hover:text-cyan-300">debris and traffic-management guide</Link> covers the conjunction side.
                </p>
              </section>

              <section id="particles">
                <h2 className="text-2xl font-bold text-white mb-4">SEUs, charging and radiation damage</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Single-event effects.</strong> An energetic proton or heavy ion passing through a memory cell or transistor can deposit enough charge to flip a bit (a single-event upset), corrupt data, or trigger a latch-up — a short-circuit state that can destroy a component if power is not cycled quickly. Solar energetic particle events raise the rate by orders of magnitude, which is why operators avoid software uploads during proton events, monitor memory scrubbing counters, and design with error-correcting memory and radiation-tolerant parts.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Surface charging.</strong> During storms and high solar wind, hot plasma charges different spacecraft surfaces to different potentials. When the difference exceeds the breakdown threshold, it arcs — electrostatic discharge that can damage coatings, solar-array strings and electronics. GEO spacecraft, sitting in the storm-time plasma sheet, are especially exposed.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  <strong className="text-slate-300">Deep dielectric charging.</strong> High-energy electrons from the enhanced outer radiation belt penetrate the spacecraft skin and accumulate in insulators — cable dielectrics, circuit boards — over hours to days. When the buried charge exceeds the material&apos;s strength it discharges internally, which is one of the most common causes of unexplained anomalies in the days after a storm, when Kp has already fallen.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Cumulative damage.</strong> Total ionising dose degrades solar-array output, optics and semiconductor performance over a mission; a severe storm delivers a large slice of a mission&apos;s budgeted dose in a few days. The May 2024 G5 storm caused temporary anomalies on multiple Starlink satellites and required orientation adjustments across several constellations. Our <Link href="/radiation-calculator" className="text-cyan-400 hover:text-cyan-300">radiation calculator</Link> estimates dose and single-event rates for a given orbit.
                </p>
              </section>

              <section id="starlink">
                <h2 className="text-2xl font-bold text-white mb-4">Case study: February 2022</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  On February 4, 2022, SpaceX launched 49 Starlink satellites into their standard low deployment orbit, from which they would raise themselves to operational altitude with electric propulsion. A geomagnetic storm arrived. The thermosphere expanded, drag at the deployment altitude rose well above what the satellites could out-climb, and <strong className="text-slate-300">40 of the 49</strong> reentered and burned up before reaching their working orbit. Our coverage put the loss at an estimated $50 million.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  Three lessons. First, the deployment altitude is what turned a storm into a loss — satellites already at operational altitude rode it out — so margin is a design decision, not a forecasting one. Second, the risk was visible: operators with space weather alerts configured against the forecast could have seen it, and holding the launch would have cost far less than the payload. Third, it changed behaviour: SpaceX built internal models to predict drag on its fleet during storms, and the episode is now the standard argument for checking the geomagnetic forecast before committing a launch to a low deployment orbit.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The historical bookends are worth knowing too. The Halloween storms of October 2003 caused hundreds of millions of dollars in satellite damage, blacked out HF communications and forced polar reroutes; the March 1989 storm collapsed Hydro-Québec&apos;s grid in 90 seconds and left 6 million people without power for 9 hours; and the 1859 Carrington event, the most powerful on record, set telegraph systems sparking worldwide. A 2017 American Meteorological Society study estimated that a single extreme event today could cause $1-2 trillion of economic damage in its first year.
                </p>
              </section>

              <section id="forecast">
                <h2 className="text-2xl font-bold text-white mb-4">How much warning you get</h2>
                <p className="text-slate-400 leading-relaxed mb-4">
                  The forecasting chain runs from the Sun inward. NASA&apos;s Solar Dynamics Observatory images the disk continuously and tracks active regions; SOHO at the L1 point catches CMEs leaving the Sun with its coronagraphs; STEREO gives a side view. When an Earth-directed CME is seen, NOAA&apos;s Space Weather Prediction Center runs the WSA-Enlil model to predict its arrival — now typically within 6-12 hours of the true time — but the magnetic field orientation, which decides whether the storm is a G1 or a G4, remains hard to predict until the CME is measured directly.
                </p>
                <p className="text-slate-400 leading-relaxed mb-4">
                  That measurement comes from DSCOVR, sitting at L1 about 1.5 million km sunward, which samples the solar wind and its magnetic field as it passes and gives 15-60 minutes of warning before the same plasma reaches Earth. It is the last line of defence and the only source of Bz before impact. ESA&apos;s Vigil mission, planned for 2031 at the L5 point, will watch CMEs from the side and should improve arrival-time and structure predictions substantially. Machine-learning models — NASA&apos;s DAGGER predicts geomagnetic perturbations 30 minutes ahead — are beginning to outperform physics-only forecasts for some event types.
                </p>
                <p className="text-slate-400 leading-relaxed">
                  The practical timeline for an operator, then: <strong className="text-slate-300">zero warning</strong> for flare radiation and radio blackouts; <strong className="text-slate-300">minutes to hours</strong> for energetic particles; <strong className="text-slate-300">one to three days</strong> for a CME-driven storm, with severity uncertain until DSCOVR sees it; and <strong className="text-slate-300">days of elevated drag and radiation-belt flux</strong> after the peak. Our dashboard pulls SWPC&apos;s Kp feed and NASA DONKI&apos;s flare, storm and CME catalogues, and alerts fire when conditions cross the thresholds you set.
                </p>
              </section>

              <section id="playbook">
                <h2 className="text-2xl font-bold text-white mb-4">The operational playbook</h2>
                <ul className="space-y-3 text-slate-400 leading-relaxed mb-4">
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Before anything happens.</strong> Write space weather into the concept of operations: named thresholds, named responses, named owners. Configure alerts at Kp 5, M-class flares, elevated proton flux and southward Bz. Decide launch and deployment hold criteria in advance. Reserve propellant for storm drag. Know which subsystems are latch-up-prone and how each is recovered.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">CME watch issued (1-3 days out).</strong> Review the manifest: postpone launches to low deployment orbits, non-essential manoeuvres, and software uploads scheduled for the arrival window. Brief the operations team on expected arrival and the range of outcomes. Pre-position recovery procedures.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Kp 5-6 (G1-G2).</strong> Increase telemetry monitoring cadence. Postpone non-essential manoeuvres. Review housekeeping data for early anomalies — attitude sensor noise, unexpected resets, current spikes.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Kp 7+ (G3+).</strong> Safe mode for vulnerable spacecraft — power down non-essential systems and orient to minimise exposure. Suspend LEO orbit determination and treat conjunction screening as degraded. Prepare ground systems and customers for GPS degradation and HF outages.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Solar proton event.</strong> Power down sensitive instruments, especially on science missions. Watch single-event upset counters and memory scrubbing logs. No software uploads until flux subsides.</span></li>
                  <li className="flex items-start gap-3"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" /><span><strong className="text-slate-300">Recovery (days after).</strong> Re-establish orbit determination with fresh tracking. Expect deep-dielectric discharges and late anomalies as the outer belt stays enhanced. Re-baseline drag predictions and station-keeping plans. Log everything: anomaly investigations and insurance claims depend on correlating events with the storm timeline.</span></li>
                </ul>
                <p className="text-slate-400 leading-relaxed">
                  The best operators, as our monitoring guide puts it, do not react to space weather — they design for it. Tools on SpaceNexus: the <Link href="/space-weather" className="text-cyan-400 hover:text-cyan-300">space weather dashboard</Link>, the <Link href="/space-environment" className="text-cyan-400 hover:text-cyan-300">space environment monitor</Link>, <Link href="/alerts" className="text-cyan-400 hover:text-cyan-300">configurable alerts</Link>, and — for the enjoyable side of a geomagnetic storm — the <Link href="/aurora-forecast" className="text-cyan-400 hover:text-cyan-300">aurora forecast</Link>.
                </p>
              </section>

              <section id="faq">
                <h2 className="text-2xl font-bold text-white mb-4">Frequently asked</h2>
                <div className="space-y-4">
                  {FAQ.map((f) => (
                    <div key={f.q}>
                      <h3 className="text-base font-semibold text-white mb-1">{f.q}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{f.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section id="sources" className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Sources</h2>
                <p className="text-sm text-slate-500 mb-3">Every figure is from a SpaceNexus article or from the data feeds our dashboard uses. Where our articles disagree on a number (the 2003 satellite-damage total, for instance), this guide writes qualitatively.</p>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li><Link href="/blog/how-to-monitor-space-weather-for-satellite-operators" className="text-cyan-400 hover:text-cyan-300">How to monitor space weather: a guide for satellite operators</Link> (Mar 2026) — flare classes; Kp thresholds (4 unsettled, 5-6 minor, 7+ major; alert at 5); solar wind 300-400 km/s normal, 600+ high-speed stream; Bz as chief predictor; charging and SEU mechanisms; operational response at Kp 5-6, Kp 7+, and proton events; 40 Starlink satellites lost Feb 2022; Carrington 1859.</li>
                  <li><Link href="/blog/space-weather-explained-solar-flares-cmes" className="text-cyan-400 hover:text-cyan-300">Space weather explained: solar flares, CMEs and why they matter</Link> (Mar 2026) — 8-minute flare arrival; CME 250-3,000 km/s, 15-72 hours; G1-G5 effects; X10+ extreme; southward-field reconnection; May 2024 G5 Starlink anomalies; Solar Cycle 25 from Dec 2019, peak 2024-2026; 1989 Québec 6M people / 9 hours; SDO, SOHO, DSCOVR (L1, ~1.5M km, 15-60 min), STEREO.</li>
                  <li><Link href="/blog/space-weather-impact-technology-infrastructure" className="text-cyan-400 hover:text-cyan-300">Space weather&apos;s impact on technology</Link> (Mar 2026) — 1989 Québec collapse in 90 seconds; GPS 3 m to 10-100 m; WAAS advisories; HF blackout durations; polar reroutes.</li>
                  <li><Link href="/blog/space-weather-forecasting-predicting-solar-storms" className="text-cyan-400 hover:text-cyan-300">Space weather forecasting</Link> (Mar 2026) — leading cause of anomalies outside manufacturing defects; WSA-Enlil 6-12 hour arrival accuracy; DAGGER 30-minute lead; Vigil 2031 at L5; SpaceX internal drag models; AMS 2017 $1-2T estimate; Halloween 2003 storms; correlated insurance losses.</li>
                  <li><Link href="/blog/space-weather-monitoring-business-impact" className="text-cyan-400 hover:text-cyan-300">How to monitor space weather and why it matters for your business</Link> (Feb 2026) — Feb 2022 loss ~$50M; Bz below −10 nT; solar wind above 500 km/s; proton flux; NOAA SWPC, NASA DONKI, ACE/DSCOVR as data sources.</li>
                  <li><Link href="/blog/why-space-industry-professionals-need-alerts" className="text-cyan-400 hover:text-cyan-300">Why space professionals need real-time alerts</Link> (Mar 2026) — Feb 4, 2022: 49 launched, 40 lost.</li>
                  <li><Link href="/space-weather" className="text-cyan-400 hover:text-cyan-300">SpaceNexus space weather dashboard</Link> — planetary Kp from NOAA SWPC (3-hour cadence); flares, geomagnetic storms and CMEs from NASA DONKI.</li>
                </ul>
              </section>

              <section className="pt-6 border-t border-white/[0.06]">
                <h2 className="text-lg font-bold text-white mb-3">Further reading</h2>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/blog/how-to-monitor-space-weather-for-satellite-operators" className="text-cyan-400 hover:text-cyan-300">How to monitor space weather: a guide for satellite operators and engineers</Link> — the tools and indices in detail.</li>
                  <li><Link href="/blog/space-weather-explained-solar-flares-cmes" className="text-cyan-400 hover:text-cyan-300">Space weather explained: solar flares, CMEs and why they matter</Link> — the physics and the solar cycle.</li>
                  <li><Link href="/blog/space-weather-impact-technology-infrastructure" className="text-cyan-400 hover:text-cyan-300">Space weather&apos;s impact on technology: GPS, power grids and aviation</Link> — the ground-segment view.</li>
                  <li><Link href="/blog/space-weather-forecasting-predicting-solar-storms" className="text-cyan-400 hover:text-cyan-300">Space weather forecasting: predicting solar storms before they strike</Link> — models, missions and the economics of lead time.</li>
                  <li><Link href="/blog/how-to-use-spacenexus-space-weather-dashboard" className="text-cyan-400 hover:text-cyan-300">How to use the SpaceNexus space weather dashboard</Link> — setting thresholds and alerts.</li>
                </ul>
              </section>

              <GuideNavigation currentSlug="space-weather-risk-for-operators" />
              <RelatedModules modules={PAGE_RELATIONS['guide/space-weather-risk-for-operators']} />
            </article>
          </ScrollReveal>

          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'Article', headline: TITLE, description: DESCRIPTION,
            author: { '@type': 'Organization', name: 'SpaceNexus' }, publisher: { '@type': 'Organization', name: 'SpaceNexus', logo: { '@type': 'ImageObject', url: 'https://spacenexus.us/logo.png' } },
            datePublished: '2026-09-01T00:00:00Z', dateModified: now.toISOString(), mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://spacenexus.us/guide/space-weather-risk-for-operators' },
          }).replace(/</g, '\\u003c') }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          }).replace(/</g, '\\u003c') }} />
          <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Guides', href: '/guide' }, { name: 'Space Weather Risk for Operators' }]} />
        </div>
      </div>
    </div>
  );
}
