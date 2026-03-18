'use client';

import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

interface SpottableSatellite {
  name: string;
  magnitude: string;
  description: string;
  bestTime: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
}

const BEST_SATELLITES: SpottableSatellite[] = [
  {
    name: 'International Space Station (ISS)',
    magnitude: '-3.5 to -6',
    description:
      'The brightest artificial object in the sky. At magnitude -6, the ISS outshines Venus and is unmistakable as it crosses the sky in 4-6 minutes. It orbits at ~420 km altitude and can cast visible shadows at peak brightness.',
    bestTime: 'Dawn & dusk, year-round',
    difficulty: 'Easy',
  },
  {
    name: 'Starlink Satellite Trains',
    magnitude: '+1 to +3',
    description:
      'Shortly after SpaceX launches a batch, Starlink satellites travel in a "train" formation — a stunning string of lights moving across the sky in sequence. They become fainter as they raise orbit, but fresh trains are unforgettable.',
    bestTime: '1-3 weeks after launch, dawn/dusk',
    difficulty: 'Easy',
  },
  {
    name: 'Hubble Space Telescope',
    magnitude: '+1 to +2',
    description:
      'Orbiting at ~540 km in a 28.5-degree inclination, Hubble is visible from mid-latitudes and appears as a steady, moderately bright star gliding across the sky. Best spotted when the sun angle is just right.',
    bestTime: 'Dawn/dusk from mid-latitudes',
    difficulty: 'Moderate',
  },
  {
    name: 'Tiangong Space Station',
    magnitude: '-1 to -3',
    description:
      'China\'s modular space station orbits at ~390 km and can rival Jupiter in brightness. Its 41.5-degree inclination means it\'s best observed from latitudes between 42 N and 42 S.',
    bestTime: 'Dawn/dusk from lower latitudes',
    difficulty: 'Moderate',
  },
  {
    name: 'Iridium Flares (Legacy)',
    magnitude: 'Up to -8',
    description:
      'The original Iridium constellation was famous for producing brief but incredibly bright "flares" as sunlight reflected off their door-sized antennas. Most have deorbited, but a few remain and still produce spectacular predictable flashes.',
    bestTime: 'Predicted events at dusk/dawn',
    difficulty: 'Advanced',
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  Moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const VIEWING_TIPS = [
  {
    title: 'Dark-Adapt Your Eyes',
    description:
      'Avoid looking at your phone for at least 10-15 minutes before observing. Use a red flashlight if you need light. Your pupils need time to fully dilate for maximum sensitivity.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: 'Face South (Northern Hemisphere)',
    description:
      'Most satellite passes arc from west to east. Facing south gives you the widest view of the transit arc. In the southern hemisphere, face north instead.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      </svg>
    ),
  },
  {
    title: 'Be Patient',
    description:
      'Satellite passes are brief — typically 2 to 6 minutes. Arrive a few minutes early, get comfortable, and watch the predicted direction. If you miss one pass, another is usually within a day or two.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Bring Binoculars',
    description:
      'Standard 7x50 or 10x50 binoculars dramatically improve your experience. They reveal fainter satellites, show color differences, and let you see the ISS as more than just a dot. A tripod adapter helps for steady viewing.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: 'Choose Dark Skies',
    description:
      'Light pollution washes out fainter satellites. Even moving to a suburban park can help. The ISS is visible from cities, but Starlink trains and Hubble need darker skies for best results.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  },
  {
    title: 'Check the Weather',
    description:
      'Clear skies are essential. Cloud cover blocks even the brightest satellites. Check your local forecast and have a backup date planned. Thin cirrus clouds can reduce brightness by several magnitudes.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
  },
];

const APPS_AND_TOOLS = [
  {
    name: 'SpaceNexus Satellite Tracker',
    description:
      'Our built-in live tracker shows real-time positions of the ISS, Starlink, weather satellites, and more on an interactive map. Filter by orbit type and search by name or NORAD ID.',
    url: '/satellites',
    highlight: true,
  },
  {
    name: 'Heavens-Above',
    description:
      'Classic web-based tool for predicting satellite passes from your location. Provides sky charts, exact pass times, brightness predictions, and Iridium flare forecasts.',
    url: 'https://heavens-above.com',
    highlight: false,
  },
  {
    name: 'ISS Detector (Mobile)',
    description:
      'Mobile app for Android and iOS that sends push notifications before bright ISS passes. Includes a compass mode that points you at the satellite in real time.',
    url: null,
    highlight: false,
  },
  {
    name: 'N2YO',
    description:
      'Web-based satellite tracking with 3D visualization. Tracks over 20,000 objects and provides 10-day pass predictions for your location.',
    url: 'https://n2yo.com',
    highlight: false,
  },
  {
    name: 'Stellarium',
    description:
      'Free open-source planetarium that includes satellite overlays. Use it to preview exactly where a satellite will appear against the stars from your backyard.',
    url: 'https://stellarium.org',
    highlight: false,
  },
];

const PHOTO_SETTINGS = [
  { label: 'Camera Mode', value: 'Manual / Bulb' },
  { label: 'ISO', value: '800-3200' },
  { label: 'Aperture', value: 'f/2.8 or wider' },
  { label: 'Shutter Speed', value: '10-30 seconds' },
  { label: 'Focus', value: 'Manual, set to infinity on a bright star' },
  { label: 'Tripod', value: 'Essential — no handheld long exposures' },
  { label: 'Timer/Remote', value: '2-second delay or intervalometer' },
  { label: 'Format', value: 'RAW for maximum post-processing flexibility' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function SatelliteSpottingPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="How to Spot Satellites"
          subtitle="Your complete guide to seeing satellites with the naked eye -- from the brilliant ISS to stunning Starlink trains"
          icon={<span className="text-4xl">&#127776;</span>}
          accentColor="cyan"
        />

        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-slate-400" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
            </li>
            <li>/</li>
            <li>
              <Link href="/learn" className="hover:text-white transition-colors">Learn</Link>
            </li>
            <li>/</li>
            <li className="text-slate-300">Satellite Spotting Guide</li>
          </ol>
        </nav>

        {/* Intro */}
        <ScrollReveal>
          <div className="card-elevated p-6 sm:p-8 mb-10 border border-cyan-500/10">
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-4">
              On any clear evening, hundreds of satellites are visible from your backyard without a telescope.
              They appear as steady points of light gliding silently across the starfield — and once you know
              when and where to look, spotting them becomes addictive.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              This guide covers the best satellites to spot, the optimal viewing windows, what to expect,
              and the apps that will tell you exactly when to look up. Whether you&apos;re a complete beginner
              or an experienced observer looking for a new challenge, you&apos;ll find actionable tips below.
            </p>
          </div>
        </ScrollReveal>

        {/* ── Section 1: Best Satellites to Spot ────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">1</span>
              Best Satellites to Spot
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Ranked by brightness and ease of spotting. Magnitude is a measure of brightness — lower (more negative) numbers mean brighter objects.
            </p>

            <div className="space-y-4">
              {BEST_SATELLITES.map((sat) => (
                <div
                  key={sat.name}
                  className="card p-5 hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-base">{sat.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">Magnitude: <span className="text-cyan-400 font-mono">{sat.magnitude}</span></span>
                        <span className="text-xs text-slate-500">Best: <span className="text-slate-300">{sat.bestTime}</span></span>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[sat.difficulty]}`}>
                      {sat.difficulty}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{sat.description}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 2: When to Look ───────────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">2</span>
              When to Look
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Timing is everything. Satellites are visible only when they are sunlit while the observer is in darkness.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="text-white font-semibold mb-2">The Golden Window: Dawn &amp; Dusk</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  The ideal viewing window is roughly <strong className="text-white">30 to 120 minutes after sunset</strong> or{' '}
                  <strong className="text-white">30 to 120 minutes before sunrise</strong>. During these times, the
                  ground is dark enough to see dim objects while low-Earth orbit satellites are still illuminated by the sun.
                </p>
              </div>

              <div className="card p-5">
                <h3 className="text-white font-semibold mb-2">Solar Angle Explained</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  As the sun drops further below the horizon, only higher-altitude satellites remain sunlit. LEO satellites
                  (~400 km) enter Earth&apos;s shadow about 2 hours after sunset. GEO satellites (~36,000 km) can remain visible
                  most of the night during equinoxes.
                </p>
              </div>

              <div className="card p-5">
                <h3 className="text-white font-semibold mb-2">Best Months</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Summer months near solstice offer the longest viewing windows because the sun doesn&apos;t dip far below the
                  horizon, keeping LEO objects lit longer. However, equinox months (March and September) are prime time for
                  geostationary satellite viewing and Iridium flares.
                </p>
              </div>

              <div className="card p-5">
                <h3 className="text-white font-semibold mb-2">Seasonal Starlink Tips</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Fresh Starlink trains are visible 1-3 weeks after launch at their brightest. SpaceX launches Starlink missions
                  roughly every 1-2 weeks, so there are frequent opportunities. Check launch schedules and look for trains at dusk
                  1-5 days after launch for the most dramatic views.
                </p>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 3: What You'll See ────────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">3</span>
              What You&apos;ll See
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Knowing what to expect makes your first sighting much more exciting.
            </p>

            <div className="card-elevated p-6 space-y-5">
              <div>
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Appearance</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A satellite looks like a <strong className="text-white">steady, non-blinking point of light</strong> moving
                  smoothly across the sky. Unlike airplanes, satellites do not have red/green navigation lights or flashing
                  strobes. The light is a constant, usually white or slightly warm glow from reflected sunlight.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Speed</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  LEO satellites cross the entire sky in <strong className="text-white">3 to 6 minutes</strong>. They move
                  noticeably faster than stars but slower than shooting stars or aircraft. At arm&apos;s length, a typical ISS pass
                  covers about one degree per second — roughly two full moon widths per second.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Direction</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Most LEO satellites travel roughly <strong className="text-white">west to east</strong>, following their orbital
                  inclination. The ISS (51.6-degree inclination) can appear from the southwest and disappear to the northeast, or
                  vice versa. Polar-orbiting satellites travel north-to-south or south-to-north.
                </p>
              </div>

              <div className="border-t border-white/[0.06] pt-5">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-2">Flares &amp; Fading</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Some satellites briefly brighten dramatically — these are called <strong className="text-white">"flares"</strong>.
                  They occur when a flat, reflective surface (like a solar panel) catches the sun at just the right angle.
                  Satellites can also abruptly disappear mid-pass as they enter Earth&apos;s shadow — a fascinating sight that proves
                  you&apos;re watching something in orbit, not an airplane.
                </p>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 4: Apps & Tools ───────────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">4</span>
              Apps &amp; Tools
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              These tools predict exactly when and where satellites will appear from your location.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {APPS_AND_TOOLS.map((app) => (
                <div
                  key={app.name}
                  className={`card p-5 transition-all ${
                    app.highlight ? 'border-cyan-500/30 bg-cyan-500/[0.03]' : 'hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-white font-semibold text-sm">{app.name}</h3>
                    {app.highlight && (
                      <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
                        Ours
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed mb-3">{app.description}</p>
                  {app.url && (
                    <Link
                      href={app.url}
                      className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                      {...(app.url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {app.highlight ? 'Open Tracker' : 'Visit'}
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 5: Tips for Beginners ─────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">5</span>
              Tips for Beginners
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Maximize your chances of a successful sighting.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {VIEWING_TIPS.map((tip) => (
                <div key={tip.title} className="card p-5 hover:border-white/10 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center text-cyan-400 mb-3">
                    {tip.icon}
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{tip.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{tip.description}</p>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 6: Photography Tips ──────────────────────────────── */}
        <ScrollReveal>
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">6</span>
              Photography Tips
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Capture satellite trails and ISS passes with a DSLR or mirrorless camera.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Camera settings table */}
              <div className="card p-5">
                <h3 className="text-white font-semibold mb-4">Recommended Camera Settings</h3>
                <div className="space-y-2">
                  {PHOTO_SETTINGS.map((setting) => (
                    <div key={setting.label} className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-b-0">
                      <span className="text-slate-400 text-sm">{setting.label}</span>
                      <span className="text-white text-sm font-mono">{setting.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technique tips */}
              <div className="space-y-4">
                <div className="card p-5">
                  <h3 className="text-white font-semibold mb-2">Long Exposure Trails</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    A 20-30 second exposure creates a bright streak across the frame as the satellite moves.
                    Compose your shot with interesting foreground elements — trees, buildings, or landscapes — to
                    add context. Stack multiple exposures in post for dramatic multi-trail composites.
                  </p>
                </div>

                <div className="card p-5">
                  <h3 className="text-white font-semibold mb-2">Star Tracker Mounts</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    A motorized star tracker like the iOptron SkyGuider or Sky-Watcher Star Adventurer compensates
                    for Earth&apos;s rotation, producing pinpoint stars in long exposures. The satellite will still
                    streak (it moves relative to stars), creating a dramatic contrast.
                  </p>
                </div>

                <div className="card p-5">
                  <h3 className="text-white font-semibold mb-2">ISS Transit Photography</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Advanced photographers capture the ISS transiting the Moon or Sun using a telescope and high-speed
                    camera. These "ISS transits" reveal the station&apos;s structure — solar panels and modules — in stunning
                    silhouette. Use transit-finder.com to predict events for your location.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="card-elevated p-8 text-center mb-10 border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.04] to-transparent">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              Ready to Track Satellites Live?
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-6 max-w-xl mx-auto">
              Use our real-time satellite tracker to find the ISS, Starlink trains, and thousands of other
              objects currently orbiting Earth. See exactly where they are right now.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/satellites"
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-all text-sm"
              >
                Open Satellite Tracker
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/satellite-tracker"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium rounded-lg transition-all text-sm"
              >
                Live Tracker Map
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <RelatedModules
          modules={
            PAGE_RELATIONS['satellite-spotting'] || [
              { name: 'Satellite Tracker', description: 'Live orbital tracking', href: '/satellites', icon: '&#128752;' },
              { name: 'Space Weather', description: 'Solar conditions', href: '/space-weather', icon: '&#9728;' },
              { name: 'Learning Hub', description: 'Educational content', href: '/learn', icon: '&#128218;' },
              { name: 'Orbit Guide', description: 'Orbit types explained', href: '/orbit-guide', icon: '&#127744;' },
            ]
          }
        />
      </div>
    </div>
  );
}
