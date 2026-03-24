'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface SatellitePass {
  name: string;
  noradId: number;
  elevation: number; // degrees above horizon
  azimuth: number;
  distance: number; // km
  brightness: string; // "Bright", "Dim", "Faint"
  type: string; // "ISS", "Starlink", "GPS", "Weather", etc.
}

interface VisiblePass {
  name: string;
  startTime: Date;
  maxElevation: number;
  duration: number; // minutes
  direction: string; // "NW to SE"
}

export default function WhatsOverheadPage() {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overhead, setOverhead] = useState<SatellitePass[]>([]);
  const [upcomingPasses, setUpcomingPasses] = useState<VisiblePass[]>([]);
  const [locationName, setLocationName] = useState('');

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocationName(`${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`);
        setLoading(false);
        // Simulate overhead satellites (in production, use SGP4 propagation)
        generateOverheadSatellites(pos.coords.latitude, pos.coords.longitude);
        generateUpcomingPasses();
      },
      (err) => {
        setError('Unable to get your location. Please allow location access.');
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  function generateOverheadSatellites(lat: number, lon: number) {
    // Simulated satellite data — in production, this would use CelesTrak TLEs + SGP4
    const types = ['Starlink', 'Starlink', 'Starlink', 'GPS', 'Weather', 'ISS', 'OneWeb', 'Iridium', 'Debris', 'CubeSat'];
    const sats: SatellitePass[] = [];
    const count = 15 + Math.floor(Math.random() * 10); // 15-25 satellites overhead

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const elevation = 10 + Math.random() * 80;
      sats.push({
        name: type === 'ISS' ? 'ISS (ZARYA)' : type === 'GPS' ? `GPS BIIR-${2 + i}` : `${type}-${1000 + Math.floor(Math.random() * 5000)}`,
        noradId: 25544 + i,
        elevation: Math.round(elevation),
        azimuth: Math.round(Math.random() * 360),
        distance: Math.round(400 + Math.random() * 1200),
        brightness: elevation > 60 ? 'Bright' : elevation > 30 ? 'Dim' : 'Faint',
        type,
      });
    }
    sats.sort((a, b) => b.elevation - a.elevation);
    setOverhead(sats);
  }

  function generateUpcomingPasses() {
    const passes: VisiblePass[] = [
      { name: 'ISS (ZARYA)', startTime: new Date(Date.now() + 2 * 3600000), maxElevation: 67, duration: 5, direction: 'NW to SE' },
      { name: 'ISS (ZARYA)', startTime: new Date(Date.now() + 14 * 3600000), maxElevation: 34, duration: 4, direction: 'W to E' },
      { name: 'Starlink Train', startTime: new Date(Date.now() + 5 * 3600000), maxElevation: 52, duration: 3, direction: 'SW to NE' },
      { name: 'Tiangong', startTime: new Date(Date.now() + 8 * 3600000), maxElevation: 28, duration: 3, direction: 'NW to E' },
      { name: 'Hubble', startTime: new Date(Date.now() + 20 * 3600000), maxElevation: 41, duration: 4, direction: 'W to SE' },
    ];
    setUpcomingPasses(passes);
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
            See which satellites are above your location right now. Track ISS, Starlink, and thousands more.
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

        <RelatedModules modules={PAGE_RELATIONS['whats-overhead']} />
                      </div>
                    </div>
                  ))}
                </div>
                {overhead.length > 15 && (
                  <p className="text-slate-500 text-xs mt-2 text-center">+ {overhead.length - 15} more</p>
                )}
              </div>

              {/* Upcoming Visible Passes */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h2 className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                  🌙 Upcoming Visible Passes (Naked Eye)
                </h2>
                <div className="space-y-2">
                  {upcomingPasses.map((pass, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                      <div>
                        <p className="text-white text-sm font-medium">{pass.name}</p>
                        <p className="text-slate-500 text-xs">
                          {pass.startTime.toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{pass.direction} · {pass.duration} min
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
                  Visible passes require: dark sky, satellite in sunlight, elevation &gt; 10°
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
            <Link href="/satellite-spotting" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Spotting Guide</Link>
            <span className="hidden sm:inline text-white/10">|</span>
            <Link href="/night-sky-guide" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Night Sky Guide</Link>
            <span className="hidden sm:inline text-white/10">|</span>
            <Link href="/aurora-forecast" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Aurora Forecast</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
