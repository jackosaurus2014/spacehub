'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { clientLogger } from '@/lib/client-logger';

// ─── Types ──────────────────────────────────────────────────────────────────
type OrbitClass = 'LEO' | 'MEO' | 'GEO' | 'HEO';
type SatCategory = 'all' | 'stations' | 'starlink' | 'weather' | 'gps-ops' | 'active';

interface SatPosition {
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
}

interface TLESatellite {
  noradId: string;
  name: string;
  orbitClass: OrbitClass;
  category: string;
  position: SatPosition;
  tle: {
    line1: string;
    line2: string;
    epoch: string;
    inclination: number;
    eccentricity: number;
    meanMotion: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ORBIT_COLORS: Record<OrbitClass, string> = {
  LEO: '#22d3ee',   // cyan-400
  MEO: '#facc15',   // yellow-400
  GEO: '#e879f9',   // fuchsia-400
  HEO: '#4ade80',   // green-400
};

const ORBIT_LABELS: Record<OrbitClass, string> = {
  LEO: 'Low Earth Orbit',
  MEO: 'Medium Earth Orbit',
  GEO: 'Geostationary',
  HEO: 'Highly Elliptical',
};

const CATEGORY_OPTIONS: { value: SatCategory; label: string }[] = [
  { value: 'all', label: 'All Satellites' },
  { value: 'stations', label: 'Space Stations' },
  { value: 'starlink', label: 'Starlink' },
  { value: 'weather', label: 'Weather' },
  { value: 'gps-ops', label: 'Navigation (GPS)' },
  { value: 'active', label: 'Active' },
];

const FEATURED_IDS = ['25544', '20580', '48274', '44713', '36585', '41866'];

// ─── Continent Outlines (simplified equirectangular coordinates) ────────────
// Each continent is an array of [lng, lat] points forming a rough outline.
// These are simplified for canvas rendering.
const CONTINENT_PATHS: [number, number][][] = [
  // North America
  [[-130,50],[-125,60],[-120,68],[-100,72],[-85,75],[-65,72],[-60,60],[-65,50],[-75,35],[-80,30],[-85,25],[-95,20],[-105,20],[-115,30],[-120,35],[-130,50]],
  // South America
  [[-80,10],[-75,5],[-65,-5],[-60,-10],[-55,-15],[-50,-20],[-45,-25],[-40,-20],[-35,-10],[-40,-5],[-50,0],[-55,5],[-60,10],[-70,12],[-75,10],[-80,10]],
  // Europe
  [[-10,35],[0,40],[5,45],[10,50],[20,55],[30,60],[35,70],[30,72],[20,70],[10,60],[5,50],[0,48],[-5,45],[-10,40],[-10,35]],
  // Africa
  [[-15,30],[-5,35],[10,37],[20,32],[30,30],[35,30],[40,10],[50,15],[50,0],[40,-10],[35,-25],[30,-35],[20,-35],[15,-25],[10,-5],[5,5],[-5,5],[-10,10],[-15,20],[-15,30]],
  // Asia
  [[30,35],[40,40],[50,45],[60,50],[70,55],[80,60],[90,55],[100,50],[110,45],[120,40],[130,45],[140,50],[145,55],[150,60],[145,65],[130,70],[120,72],[100,72],[80,70],[70,60],[60,50],[50,45],[40,42],[35,35],[30,35]],
  // South-east Asia / Indonesia (simplified)
  [[95,5],[100,0],[105,-5],[110,-8],[115,-8],[120,-5],[130,-5],[135,-3],[130,0],[120,5],[110,5],[105,0],[100,3],[95,5]],
  // Australia
  [[115,-15],[120,-15],[130,-12],[135,-14],[140,-17],[148,-20],[150,-25],[150,-30],[148,-35],[143,-38],[138,-35],[135,-33],[130,-30],[125,-30],[120,-25],[115,-22],[115,-15]],
  // Greenland (simplified)
  [[-55,60],[-50,65],[-45,70],[-30,75],[-20,78],[-18,82],[-30,83],[-40,82],[-50,78],[-55,72],[-55,60]],
];

// ─── Canvas Map Component ───────────────────────────────────────────────────
function drawMap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  satellites: TLESatellite[],
  selectedId: string | null,
  hoveredId: string | null,
  time: number,
) {
  const dpr = window.devicePixelRatio || 1;

  // Clear
  ctx.fillStyle = '#0f172a'; // slate-900
  ctx.fillRect(0, 0, width, height);

  // Draw grid lines
  ctx.strokeStyle = '#1e293b'; // slate-800
  ctx.lineWidth = 0.5 * dpr;
  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = latToY(lat, height);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  // Longitude lines every 30 degrees
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = lngToX(lng, width);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Draw equator
  ctx.strokeStyle = '#334155'; // slate-700
  ctx.lineWidth = 1 * dpr;
  const eqY = latToY(0, height);
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(width, eqY);
  ctx.stroke();

  // Draw continent outlines
  ctx.strokeStyle = '#475569'; // slate-600
  ctx.fillStyle = '#1e293b20'; // very faint fill
  ctx.lineWidth = 1.2 * dpr;

  for (const continent of CONTINENT_PATHS) {
    ctx.beginPath();
    for (let i = 0; i < continent.length; i++) {
      const [lng, lat] = continent[i];
      const x = lngToX(lng, width);
      const y = latToY(lat, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Draw satellite positions
  for (const sat of satellites) {
    const x = lngToX(sat.position.lng, width);
    const y = latToY(sat.position.lat, height);
    const color = ORBIT_COLORS[sat.orbitClass] || '#94a3b8';
    const isSelected = sat.noradId === selectedId;
    const isHovered = sat.noradId === hoveredId;
    const isFeatured = FEATURED_IDS.includes(sat.noradId);
    const baseRadius = isFeatured ? 4 * dpr : 2.5 * dpr;
    const radius = isSelected ? baseRadius * 2 : isHovered ? baseRadius * 1.5 : baseRadius;

    // Glow effect for featured / selected satellites
    if (isSelected || isFeatured) {
      const glowSize = isSelected ? 20 * dpr : 12 * dpr;
      const pulse = Math.sin(time * 0.003 + parseInt(sat.noradId, 10)) * 0.3 + 0.7;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
      gradient.addColorStop(0, color + Math.round(pulse * 80).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Satellite dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Label for selected / featured satellites
    if (isSelected || (isFeatured && !satellites.find((s) => s.noradId === selectedId))) {
      const label = sat.name.length > 20 ? sat.name.substring(0, 18) + '...' : sat.name;
      ctx.font = `${(isSelected ? 12 : 10) * dpr}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#e2e8f0'; // slate-200
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const textX = x + radius + 6 * dpr;
      const textY = y;

      // Background for readability
      const metrics = ctx.measureText(label);
      const pad = 3 * dpr;
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(textX - pad, textY - 7 * dpr, metrics.width + pad * 2, 14 * dpr);
      ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
      ctx.fillText(label, textX, textY);
    }
  }

  // Draw legend
  drawLegend(ctx, width, height, dpr);
}

function drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number) {
  const legendX = 12 * dpr;
  const legendY = height - 60 * dpr;
  const lineHeight = 16 * dpr;

  ctx.font = `${10 * dpr}px Inter, system-ui, sans-serif`;

  const items: [string, string][] = [
    ['LEO', ORBIT_COLORS.LEO],
    ['MEO', ORBIT_COLORS.MEO],
    ['GEO', ORBIT_COLORS.GEO],
    ['HEO', ORBIT_COLORS.HEO],
  ];

  // Background
  ctx.fillStyle = '#0f172acc';
  ctx.fillRect(legendX - 4 * dpr, legendY - 4 * dpr, 60 * dpr, items.length * lineHeight + 8 * dpr);

  items.forEach(([label, color], i) => {
    const y = legendY + i * lineHeight + lineHeight / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(legendX + 5 * dpr, y, 3 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, legendX + 14 * dpr, y);
  });
}

function lngToX(lng: number, width: number): number {
  return ((lng + 180) / 360) * width;
}

function latToY(lat: number, height: number): number {
  return ((90 - lat) / 180) * height;
}

function xToLng(x: number, width: number): number {
  return (x / width) * 360 - 180;
}

function yToLat(y: number, height: number): number {
  return 90 - (y / height) * 180;
}

// ─── Main Page Component ────────────────────────────────────────────────────
export default function SatelliteTrackerPage() {
  const [satellites, setSatellites] = useState<TLESatellite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSat, setSelectedSat] = useState<string | null>(null);
  const [hoveredSat, setHoveredSat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orbitFilter, setOrbitFilter] = useState<OrbitClass | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<SatCategory>('all');
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // ─── Fetch TLE data ───────────────────────────────────────────────────────
  const fetchTLEData = useCallback(async (signal?: AbortSignal) => {
    try {
      setError(null);
      const res = await fetch('/api/satellites/tle?limit=200', { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && json.data) {
        setSatellites(json.data);
        setLastRefresh(new Date().toLocaleTimeString());
      } else {
        throw new Error(json.error?.message || 'Unknown error');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      clientLogger.error('Failed to fetch TLE data', {
        error: err instanceof Error ? err.message : String(err),
      });
      setError('Failed to load satellite data. Retrying...');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30 seconds
  useEffect(() => {
    const controller = new AbortController();
    fetchTLEData(controller.signal);
    const interval = setInterval(() => fetchTLEData(controller.signal), 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [fetchTLEData]);

  // ─── Canvas rendering ─────────────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const animate = (timestamp: number) => {
      if (!running) return;
      timeRef.current = timestamp;
      drawMap(ctx, canvas.width, canvas.height, satellites, selectedSat, hoveredSat, timestamp);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [satellites, selectedSat, hoveredSat]);

  // ─── Canvas interaction ───────────────────────────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;

      // Find closest satellite
      let closest: TLESatellite | null = null;
      let closestDist = 20 * dpr; // max click distance

      for (const sat of satellites) {
        const sx = lngToX(sat.position.lng, canvas.width);
        const sy = latToY(sat.position.lat, canvas.height);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = sat;
        }
      }

      setSelectedSat(closest ? closest.noradId : null);
    },
    [satellites]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * dpr;
      const my = (e.clientY - rect.top) * dpr;

      let closest: TLESatellite | null = null;
      let closestDist = 15 * dpr;

      for (const sat of satellites) {
        const sx = lngToX(sat.position.lng, canvas.width);
        const sy = latToY(sat.position.lat, canvas.height);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = sat;
        }
      }

      setHoveredSat(closest ? closest.noradId : null);
      canvas.style.cursor = closest ? 'pointer' : 'default';
    },
    [satellites]
  );

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredSatellites = satellites.filter((sat) => {
    if (orbitFilter && sat.orbitClass !== orbitFilter) return false;
    if (categoryFilter !== 'all' && sat.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !sat.name.toLowerCase().includes(q) &&
        !sat.noradId.includes(searchQuery)
      )
        return false;
    }
    return true;
  });

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: satellites.length,
    leo: satellites.filter((s) => s.orbitClass === 'LEO').length,
    meo: satellites.filter((s) => s.orbitClass === 'MEO').length,
    geo: satellites.filter((s) => s.orbitClass === 'GEO').length,
    heo: satellites.filter((s) => s.orbitClass === 'HEO').length,
  };

  const iss = satellites.find((s) => s.noradId === '25544');
  const selectedSatData = satellites.find((s) => s.noradId === selectedSat);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>

      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <AnimatedPageHeader
            title="Live Satellite Tracker"
            subtitle="Track satellites in real-time across all orbital regimes with live TLE-based position propagation"
            icon={<span className="text-4xl">🛰️</span>}
            accentColor="cyan"
          />

          {/* Breadcrumb nav */}
          <nav className="mb-6 text-sm text-slate-400" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/satellites" className="hover:text-white transition-colors">
                  Satellites
                </Link>
              </li>
              <li>/</li>
              <li className="text-slate-300">Live Tracker</li>
            </ol>
          </nav>

          {/* Stats Bar */}
          <ScrollReveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              <div className="card-elevated p-3 text-center">
                <div className="text-xl font-bold font-display text-white">
                  {stats.total.toLocaleString()}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">
                  Tracked
                </div>
              </div>
              <div className="card-elevated p-3 text-center">
                <div className="text-xl font-bold font-display text-cyan-400">
                  {stats.leo}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">LEO</div>
              </div>
              <div className="card-elevated p-3 text-center">
                <div className="text-xl font-bold font-display text-yellow-400">
                  {stats.meo}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">MEO</div>
              </div>
              <div className="card-elevated p-3 text-center">
                <div className="text-xl font-bold font-display text-fuchsia-400">
                  {stats.geo}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">GEO</div>
              </div>
              <div className="card-elevated p-3 text-center">
                <div className="text-xl font-bold font-display text-green-400">
                  {stats.heo}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest">HEO</div>
              </div>
              {iss && (
                <div className="card-elevated p-3 text-center border border-cyan-500/30">
                  <div className="text-xs font-bold text-cyan-300 truncate">
                    ISS: {iss.position.lat.toFixed(1)}, {iss.position.lng.toFixed(1)}
                  </div>
                  <div className="text-slate-400 text-xs uppercase tracking-widest">
                    {iss.position.altitude.toFixed(0)} km
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Error state */}
          {error && !loading && (
            <div className="card p-4 border border-red-500/20 bg-red-500/5 text-center mb-6">
              <div className="text-red-400 text-sm font-medium">{error}</div>
              <button
                onClick={() => fetchTLEData()}
                className="mt-2 px-4 py-1.5 text-sm bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Retry Now
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <EmptyState
              icon={<span className="text-4xl">🛰️</span>}
              title="Loading Satellite Data"
              description="Fetching TLE data and computing orbital positions..."
            />
          )}

          {/* Main content: Map + Sidebar */}
          {!loading && (
            <ScrollReveal>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 mb-8">
                {/* Map Canvas */}
                <div className="relative">
                  <div
                    ref={containerRef}
                    className="relative w-full rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900"
                    style={{ height: 'clamp(350px, 50vw, 550px)' }}
                  >
                    <canvas
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      onMouseMove={handleCanvasMouseMove}
                      className="w-full h-full"
                      role="img"
                      aria-label="Interactive satellite tracking map showing satellite positions on equirectangular world projection"
                      tabIndex={0}
                    />

                    {/* Map overlay: last refresh */}
                    <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs text-slate-400 bg-slate-900/80 border border-slate-700/50">
                      {lastRefresh ? `Updated: ${lastRefresh}` : 'Loading...'}
                    </div>

                    {/* Selected satellite info overlay */}
                    {selectedSatData && (
                      <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm p-4 rounded-xl bg-slate-900/95 border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-white font-semibold text-sm truncate">
                              {selectedSatData.name}
                            </h4>
                            <p className="text-slate-400 text-xs mt-0.5">
                              NORAD ID: {selectedSatData.noradId}
                            </p>
                          </div>
                          <span
                            className="shrink-0 px-2 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: ORBIT_COLORS[selectedSatData.orbitClass] + '30',
                              color: ORBIT_COLORS[selectedSatData.orbitClass],
                            }}
                          >
                            {selectedSatData.orbitClass}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-700/50">
                          <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Lat</div>
                            <div className="text-sm text-white font-mono">
                              {selectedSatData.position.lat.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Lng</div>
                            <div className="text-sm text-white font-mono">
                              {selectedSatData.position.lng.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Alt</div>
                            <div className="text-sm text-white font-mono">
                              {selectedSatData.position.altitude.toFixed(0)} km
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Vel</div>
                            <div className="text-sm text-white font-mono">
                              {selectedSatData.position.velocity.toFixed(2)} km/s
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedSat(null)}
                          className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"
                          aria-label="Close satellite details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar: Satellite List */}
                <div className="flex flex-col gap-4 min-h-0">
                  {/* Search */}
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or NORAD ID..."
                      aria-label="Search satellites"
                      className="w-full pl-10 pr-4 py-2.5 h-11 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm"
                    />
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2">
                    <select
                      value={orbitFilter}
                      onChange={(e) => setOrbitFilter(e.target.value as OrbitClass | '')}
                      aria-label="Filter by orbit type"
                      className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-10 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    >
                      <option value="">All Orbits</option>
                      <option value="LEO">LEO</option>
                      <option value="MEO">MEO</option>
                      <option value="GEO">GEO</option>
                      <option value="HEO">HEO</option>
                    </select>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as SatCategory)}
                      aria-label="Filter by category"
                      className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-10 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Results count */}
                  <div className="text-xs text-slate-500">
                    Showing {filteredSatellites.length} of {satellites.length} satellites
                    {(orbitFilter || categoryFilter !== 'all' || searchQuery) && (
                      <button
                        onClick={() => {
                          setOrbitFilter('');
                          setCategoryFilter('all');
                          setSearchQuery('');
                        }}
                        className="ml-2 text-cyan-400 hover:text-cyan-300"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>

                  {/* Satellite list */}
                  <div className="flex-1 overflow-y-auto max-h-[420px] space-y-1 pr-1 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-700">
                    {filteredSatellites.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No satellites match your filters.
                      </div>
                    ) : (
                      filteredSatellites.map((sat) => (
                        <button
                          key={sat.noradId}
                          onClick={() => setSelectedSat(sat.noradId === selectedSat ? null : sat.noradId)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm group ${
                            sat.noradId === selectedSat
                              ? 'bg-cyan-500/10 border border-cyan-500/30'
                              : 'bg-slate-800/50 border border-transparent hover:bg-slate-800 hover:border-slate-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-white font-medium truncate text-sm group-hover:text-cyan-300 transition-colors">
                                {sat.name}
                              </div>
                              <div className="text-slate-500 text-xs mt-0.5">
                                ID: {sat.noradId} &middot; {sat.position.altitude.toFixed(0)} km
                              </div>
                            </div>
                            <span
                              className="shrink-0 w-2 h-2 rounded-full"
                              style={{ backgroundColor: ORBIT_COLORS[sat.orbitClass] }}
                              title={ORBIT_LABELS[sat.orbitClass]}
                            />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Featured Satellites Section */}
          {!loading && (
            <ScrollReveal>
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>&#11088;</span> Featured Satellites
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {satellites
                    .filter((s) => FEATURED_IDS.includes(s.noradId))
                    .map((sat) => (
                      <button
                        key={sat.noradId}
                        onClick={() => setSelectedSat(sat.noradId)}
                        className={`card p-4 text-left transition-all hover:border-cyan-500/30 ${
                          sat.noradId === selectedSat
                            ? 'border-cyan-500/50 bg-cyan-500/5'
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-white font-semibold text-sm">
                              {sat.name}
                            </h3>
                            <p className="text-slate-500 text-xs mt-0.5">
                              NORAD {sat.noradId}
                            </p>
                          </div>
                          <span
                            className="shrink-0 px-1.5 py-0.5 rounded text-xs font-bold"
                            style={{
                              backgroundColor: ORBIT_COLORS[sat.orbitClass] + '20',
                              color: ORBIT_COLORS[sat.orbitClass],
                            }}
                          >
                            {sat.orbitClass}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-700/50">
                          <div>
                            <div className="text-xs text-slate-500">Alt</div>
                            <div className="text-sm text-white font-mono">
                              {sat.position.altitude.toFixed(0)} km
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Vel</div>
                            <div className="text-sm text-white font-mono">
                              {sat.position.velocity.toFixed(2)} km/s
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">Inc</div>
                            <div className="text-sm text-white font-mono">
                              {sat.tle.inclination.toFixed(1)}&deg;
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* Data Sources */}
          <ScrollReveal>
            <div className="card p-5 border-dashed mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">About This Tracker</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                <div>
                  <h4 className="text-white font-medium mb-2">Data Sources</h4>
                  <ul className="space-y-1">
                    <li>CelesTrak NORAD TLE Catalog</li>
                    <li>Simplified SGP4-lite orbital propagation</li>
                    <li>Equirectangular map projection</li>
                    <li>Auto-refreshes every 30 seconds</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">How It Works</h4>
                  <ul className="space-y-1">
                    <li>TLE data parsed from Two-Line Element sets</li>
                    <li>Positions computed via Kepler equation solver</li>
                    <li>J2 perturbation for nodal precession</li>
                    <li>GMST for Earth rotation compensation</li>
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Related Modules */}
          <RelatedModules
            modules={
              PAGE_RELATIONS['satellite-tracker'] || [
                { name: 'Satellite Database', description: 'Full satellite catalog', href: '/satellites', icon: '🛰️' },
                { name: 'Space Environment', description: 'Weather & debris tracking', href: '/space-environment', icon: '🌍' },
                { name: 'Orbital Slots', description: 'Slot management', href: '/orbital-slots', icon: '🎯' },
                { name: 'Constellations', description: 'Constellation data', href: '/constellations', icon: '⭐' },
              ]
            }
          />
        </div>
      </div>
    </>
  );
}
