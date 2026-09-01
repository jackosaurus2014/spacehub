'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

/* ------------------------------------------------------------------ */
/*  Spotting Guide data (ported from the retired /satellite-spotting)  */
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
      'The brightest artificial object in the sky. At magnitude -6, the ISS outshines Venus and is unmistakable as it crosses the sky in 4-6 minutes. It orbits at ~408 km altitude and can cast visible shadows at peak brightness.',
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

const VIEWING_TIPS: { title: string; description: string }[] = [
  {
    title: 'Dark-Adapt Your Eyes',
    description:
      'Avoid looking at your phone for at least 10-15 minutes before observing. Use a red flashlight if you need light. Your pupils need time to fully dilate for maximum sensitivity.',
  },
  {
    title: 'Face South (Northern Hemisphere)',
    description:
      'Most satellite passes arc from west to east. Facing south gives you the widest view of the transit arc. In the southern hemisphere, face north instead.',
  },
  {
    title: 'Be Patient',
    description:
      'Satellite passes are brief — typically 2 to 6 minutes. Arrive a few minutes early, get comfortable, and watch the predicted direction. If you miss one pass, another is usually within a day or two.',
  },
  {
    title: 'Bring Binoculars',
    description:
      'Standard 7x50 or 10x50 binoculars dramatically improve your experience. They reveal fainter satellites, show color differences, and let you see the ISS as more than just a dot. A tripod adapter helps for steady viewing.',
  },
  {
    title: 'Choose Dark Skies',
    description:
      'Light pollution washes out fainter satellites. Even moving to a suburban park can help. The ISS is visible from cities, but Starlink trains and Hubble need darker skies for best results.',
  },
  {
    title: 'Check the Weather',
    description:
      'Clear skies are essential. Cloud cover blocks even the brightest satellites. Check your local forecast and have a backup date planned. Thin cirrus clouds can reduce brightness by several magnitudes.',
  },
];

const APPS_AND_TOOLS: { name: string; description: string; url: string | null; highlight: boolean }[] = [
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

const PHOTO_SETTINGS: { label: string; value: string }[] = [
  { label: 'Camera Mode', value: 'Manual / Bulb' },
  { label: 'ISO', value: '800-3200' },
  { label: 'Aperture', value: 'f/2.8 or wider' },
  { label: 'Shutter Speed', value: '10-30 seconds' },
  { label: 'Focus', value: 'Manual, set to infinity on a bright star' },
  { label: 'Tripod', value: 'Essential — no handheld long exposures' },
  { label: 'Timer/Remote', value: '2-second delay or intervalometer' },
  { label: 'Format', value: 'RAW for maximum post-processing flexibility' },
];

interface SatellitePass {
  name: string;
  noradId: string;
  elevation: number; // degrees above horizon
  distance: number; // km
  brightness: string; // "Bright", "Dim", "Faint"
  type: string; // "ISS", "Starlink", "GPS", "Weather", etc.
}

interface VisiblePass {
  name: string;
  startTime: Date;
  maxElevation: number;
  duration: number; // minutes
}

export default function WhatsOverheadPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overhead, setOverhead] = useState<SatellitePass[]>([]);
  const [upcomingPasses, setUpcomingPasses] = useState<VisiblePass[]>([]);
  const [passesCoverage, setPassesCoverage] = useState<string[]>([]);
  const [locationName, setLocationName] = useState('');

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLocation({ lat, lon });
        setLocationName(`${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`);
        try {
          await loadOverhead(lat, lon);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Unable to get your location. Please allow location access.');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  async function loadOverhead(lat: number, lon: number) {
    try {
      const res = await fetch(`/api/whats-overhead?lat=${lat}&lon=${lon}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError('Unable to compute overhead satellites right now. Please try again.');
        return;
      }
      const { overhead: overheadData, upcomingPasses: passesData, coverage } = json.data;
      setOverhead(overheadData || []);
      setPassesCoverage(coverage?.passesShortlist || []);
      setUpcomingPasses(
        (passesData || []).map((p: { name: string; startTime: string; maxElevation: number; durationMinutes: number }) => ({
          name: p.name,
          startTime: new Date(p.startTime),
          maxElevation: p.maxElevation,
          duration: p.durationMinutes,
        }))
      );
    } catch {
      setError('Unable to compute overhead satellites right now. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8 text-center">
          <span className="text-5xl block mb-3">🛰️</span>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-2">
            What&apos;s Overhead Now?
          </h1>
          <p className="text-slate-400 text-sm">
            See which tracked satellites are above your location right now, computed live from CelesTrak orbital data — plus real upcoming visible passes for ISS, Tiangong, and Hubble.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Location Button */}
          {!location ? (
            <div className="card p-6 text-center">
              <p className="text-slate-400 text-sm mb-4">
                Share your location to see satellites overhead. We don&apos;t store your location.
              </p>
              <button
                onClick={getLocation}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    Find Satellites Above Me
                  </>
                )}
              </button>
              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
            </div>
          ) : (
            <>
              {/* Location Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-slate-400 text-sm">Your location: <span className="text-white">{locationName}</span></span>
                </div>
                <button onClick={getLocation} className="text-xs text-cyan-400 hover:text-cyan-300">Refresh</button>
              </div>

              {/* Overhead Count */}
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
                <p className="text-4xl font-bold text-cyan-400 mb-1">{overhead.length}</p>
                <p className="text-slate-400 text-sm">satellites overhead right now</p>
              </div>

              {/* Satellite List */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Currently Overhead</h2>
                {overhead.length === 0 && (
                  <p className="text-slate-500 text-xs py-4 text-center">
                    No tracked objects from CelesTrak&apos;s station/active catalog are currently above your horizon.
                  </p>
                )}
                <div className="space-y-1.5">
                  {overhead.slice(0, 15).map((sat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          sat.type === 'ISS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          sat.type === 'Starlink' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          sat.type === 'GPS' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          'bg-white/[0.06] text-slate-400 border border-white/[0.06]'
                        }`}>
                          {sat.type}
                        </span>
                        <span className="text-white text-xs">{sat.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">{sat.elevation}° el</span>
                        <span className="text-slate-500">{sat.distance} km</span>
                        <span className={`${
                          sat.brightness === 'Bright' ? 'text-amber-400' :
                          sat.brightness === 'Dim' ? 'text-slate-300' : 'text-slate-500'
                        }`}>{sat.brightness}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {overhead.length > 15 && (
                  <p className="text-slate-500 text-xs mt-2 text-center">+ {overhead.length - 15} more</p>
                )}
                <p className="text-slate-600 text-[10px] mt-3">
                  Computed live from CelesTrak&apos;s tracked station + active-satellite catalog (subset, capped at 500 objects) using your location and current time.
                </p>
              </div>

              {/* Upcoming Visible Passes */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h2 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                  🌙 Upcoming Visible Passes (Naked Eye)
                </h2>
                {upcomingPasses.length === 0 && (
                  <p className="text-slate-500 text-xs py-4 text-center">
                    No qualifying passes (elevation &gt; 10°) in the next 72 hours for this shortlist at your location.
                  </p>
                )}
                <div className="space-y-2">
                  {upcomingPasses.map((pass, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                      <div>
                        <p className="text-white text-sm font-medium">{pass.name}</p>
                        <p className="text-slate-500 text-xs">
                          {pass.startTime.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{pass.duration} min
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 text-xs font-mono">{pass.maxElevation}° max</p>
                        <p className="text-slate-600 text-[10px]">
                          {pass.maxElevation >= 60 ? 'Excellent' : pass.maxElevation >= 40 ? 'Good' : 'Fair'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-slate-600 text-[10px] mt-2">
                  Real pass predictions (CelesTrak TLE + simplified propagator), covering only: {passesCoverage.length > 0 ? passesCoverage.join(', ') : 'ISS, CSS (Tiangong), Hubble'}. Visible passes also require a dark sky and the satellite in sunlight.
                </p>
              </div>

              {/* ISS Section */}
              <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-purple-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">🏠</span>
                  <div>
                    <h3 className="text-white text-sm font-semibold">International Space Station</h3>
                    <p className="text-slate-500 text-[10px]">Brightest artificial object — visible to the naked eye</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-white/[0.02]">
                    <p className="text-white text-sm font-bold">408 km</p>
                    <p className="text-slate-500 text-[9px]">Altitude</p>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02]">
                    <p className="text-white text-sm font-bold">27,600 km/h</p>
                    <p className="text-slate-500 text-[9px]">Speed</p>
                  </div>
                  <div className="p-2 rounded bg-white/[0.02]">
                    <p className="text-white text-sm font-bold">92 min</p>
                    <p className="text-slate-500 text-[9px]">Orbit Period</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Full Satellite Tracker</Link>
            <span className="hidden sm:inline text-white/10">|</span>
            <Link href="/tonight" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">ISS Passes Tonight by City</Link>
            <span className="hidden sm:inline text-white/10">|</span>
            <a href="#spotting-guide" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Spotting Guide</a>
            <span className="hidden sm:inline text-white/10">|</span>
            <Link href="/night-sky-guide" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Night Sky Guide</Link>
            <span className="hidden sm:inline text-white/10">|</span>
            <Link href="/aurora-forecast" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Aurora Forecast</Link>
          </div>

          {/* ============================================================ */}
          {/* Spotting Guide (ported from the retired /satellite-spotting)  */}
          {/* ============================================================ */}
          <section id="spotting-guide" className="pt-10 mt-6 border-t border-white/[0.06] scroll-mt-20">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300 mb-2">
                How to Spot Satellites
              </h2>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Your complete guide to seeing satellites with the naked eye — from the brilliant ISS to stunning Starlink trains.
              </p>
            </div>

            {/* Best Satellites to Spot */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">1</span>
                Best Satellites to Spot
              </h3>
              <p className="text-slate-400 text-xs mb-4">
                Ranked by brightness and ease of spotting. Magnitude is a measure of brightness — lower (more negative) numbers mean brighter objects.
              </p>
              <div className="space-y-3">
                {BEST_SATELLITES.map((sat) => (
                  <div key={sat.name} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-white font-semibold text-sm">{sat.name}</h4>
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
            </div>

            {/* Tips for Beginners */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">2</span>
                Tips for Beginners
              </h3>
              <p className="text-slate-400 text-xs mb-4">Maximize your chances of a successful sighting.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIEWING_TIPS.map((tip) => (
                  <div key={tip.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <h4 className="text-white font-semibold text-sm mb-1">{tip.title}</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">{tip.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Apps & Tools */}
            <div className="mb-10">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">3</span>
                Apps &amp; Tools
              </h3>
              <p className="text-slate-400 text-xs mb-4">These tools predict exactly when and where satellites will appear from your location.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APPS_AND_TOOLS.map((app) => (
                  <div key={app.name} className={`rounded-xl border p-4 ${app.highlight ? 'border-cyan-500/30 bg-cyan-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-white font-semibold text-sm">{app.name}</h4>
                      {app.highlight && (
                        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">Ours</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed mb-2">{app.description}</p>
                    {app.url && (
                      <Link
                        href={app.url}
                        className="text-cyan-400 text-xs font-medium hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                        {...(app.url.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {app.highlight ? 'Open Tracker' : 'Visit'} &rarr;
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Photography Tips */}
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">4</span>
                Photography Tips
              </h3>
              <p className="text-slate-400 text-xs mb-4">Capture satellite trails and ISS passes with a DSLR or mirrorless camera.</p>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <h4 className="text-white font-semibold text-sm mb-3">Recommended Camera Settings</h4>
                <div className="space-y-1.5">
                  {PHOTO_SETTINGS.map((setting) => (
                    <div key={setting.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-b-0">
                      <span className="text-slate-400 text-sm">{setting.label}</span>
                      <span className="text-white text-sm font-mono">{setting.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <RelatedModules modules={PAGE_RELATIONS['whats-overhead']} />
        </div>
      </div>
    </div>
  );
}
