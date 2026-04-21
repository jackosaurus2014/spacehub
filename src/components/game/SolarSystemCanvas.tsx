'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GameState } from '@/lib/game/types';
import { LOCATIONS } from '@/lib/game/solar-system';
import { LANES } from '@/lib/game/spatial-strategy';
import { SHIP_MAP } from '@/lib/game/ships';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface SolarSystemCanvasProps {
  state: GameState;
  onUnlock: (locId: string) => void;
}

// Visual layout: positions, radius, color, emoji per location.
// y values intentionally spread to give the belt + moons some visual depth.
const LOCATION_LAYOUT: Record<string, {
  x: number; y: number; radius: number; color: string; glowColor: string; type: 'star' | 'rocky' | 'gas' | 'orbital' | 'belt' | 'moon';
}> = {
  earth_surface: { x: 0.18, y: 0.50, radius: 22, color: '#38bdf8', glowColor: '#0ea5e9', type: 'rocky' },
  leo:           { x: 0.215, y: 0.36, radius: 7,  color: '#22d3ee', glowColor: '#0891b2', type: 'orbital' },
  geo:           { x: 0.25,  y: 0.66, radius: 7,  color: '#a78bfa', glowColor: '#7c3aed', type: 'orbital' },
  lunar_orbit:   { x: 0.32,  y: 0.40, radius: 6,  color: '#94a3b8', glowColor: '#64748b', type: 'orbital' },
  lunar_surface: { x: 0.33,  y: 0.58, radius: 13, color: '#cbd5e1', glowColor: '#94a3b8', type: 'moon' },
  mars_orbit:    { x: 0.48,  y: 0.40, radius: 6,  color: '#fdba74', glowColor: '#f97316', type: 'orbital' },
  mars_surface:  { x: 0.48,  y: 0.60, radius: 14, color: '#ef4444', glowColor: '#dc2626', type: 'rocky' },
  asteroid_belt: { x: 0.60,  y: 0.50, radius: 11, color: '#a8a29e', glowColor: '#78716c', type: 'belt' },
  jupiter_system:{ x: 0.73,  y: 0.45, radius: 20, color: '#fbbf24', glowColor: '#f59e0b', type: 'gas' },
  saturn_system: { x: 0.85,  y: 0.55, radius: 17, color: '#fde68a', glowColor: '#eab308', type: 'gas' },
  outer_system:  { x: 0.94,  y: 0.50, radius: 11, color: '#818cf8', glowColor: '#6366f1', type: 'rocky' },
  // Colony locations — share body positions with orbits for visual proximity
  mercury_surface: { x: 0.10, y: 0.52, radius: 8,  color: '#d97706', glowColor: '#b45309', type: 'rocky' },
  venus_orbit:     { x: 0.14, y: 0.48, radius: 9,  color: '#fde047', glowColor: '#facc15', type: 'rocky' },
  ceres_surface:   { x: 0.58, y: 0.47, radius: 5,  color: '#78716c', glowColor: '#57534e', type: 'rocky' },
  io_surface:      { x: 0.70, y: 0.44, radius: 4,  color: '#fcd34d', glowColor: '#f59e0b', type: 'moon' },
  europa_surface:  { x: 0.72, y: 0.42, radius: 4,  color: '#e0f2fe', glowColor: '#7dd3fc', type: 'moon' },
  ganymede_surface:{ x: 0.74, y: 0.46, radius: 4,  color: '#f3f4f6', glowColor: '#94a3b8', type: 'moon' },
  callisto_surface:{ x: 0.76, y: 0.48, radius: 4,  color: '#d1d5db', glowColor: '#9ca3af', type: 'moon' },
  titan_surface:   { x: 0.84, y: 0.58, radius: 5,  color: '#fef3c7', glowColor: '#fde68a', type: 'moon' },
  enceladus_surface:{ x: 0.86, y: 0.53, radius: 3, color: '#e0f2fe', glowColor: '#7dd3fc', type: 'moon' },
  titania_surface: { x: 0.93, y: 0.48, radius: 3,  color: '#e0e7ff', glowColor: '#a5b4fc', type: 'moon' },
  triton_surface:  { x: 0.95, y: 0.52, radius: 3,  color: '#bfdbfe', glowColor: '#93c5fd', type: 'moon' },
  pluto_surface:   { x: 0.97, y: 0.50, radius: 3,  color: '#fecaca', glowColor: '#fca5a5', type: 'rocky' },
};

// Role → color for ship rendering
const SHIP_COLOR: Record<string, string> = {
  transport: '#22d3ee',
  tanker: '#60a5fa',
  mining: '#fbbf24',
  survey: '#c084fc',
};

interface StarField {
  x: number;
  y: number;
  size: number;
  speed: number;   // twinkle speed
  phase: number;
}

export default function SolarSystemCanvas({ state, onUnlock }: SolarSystemCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showLanes, setShowLanes] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const animRef = useRef(0);

  // Pre-generate a stable starfield (keeps stars in the same places between
  // frames — the draw loop reads positions from here and only updates phase).
  const starfield = useMemo<StarField[]>(() => {
    const stars: StarField[] = [];
    for (let i = 0; i < 240; i++) {
      const seed = i * 7 + 42;
      stars.push({
        x: ((Math.sin(seed) * 10000) % 1 + 1) % 1,
        y: ((Math.sin(seed * 3 + 5) * 10000) % 1 + 1) % 1,
        size: 0.3 + ((Math.sin(seed * 17) * 10000) % 1 + 1) % 1 * 1.4,
        speed: 0.3 + ((Math.sin(seed * 11) * 10000) % 1 + 1) % 1 * 0.8,
        phase: ((Math.sin(seed * 23) * 10000) % 1 + 1) % 1 * Math.PI * 2,
      });
    }
    return stars;
  }, []);

  // Resolve a location id to its layout, if present.
  const layoutOf = useCallback((locationId: string) => LOCATION_LAYOUT[locationId], []);

  const draw = useCallback((timestampMs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Clear with space gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#030310');
    bgGrad.addColorStop(1, '#05051a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // ─── Stars (twinkling) ────────────────────────────────────────
    const tSec = timestampMs * 0.001;
    for (const s of starfield) {
      const sx = s.x * w;
      const sy = s.y * h;
      const alpha = 0.15 + Math.abs(Math.sin(tSec * s.speed + s.phase)) * 0.55;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const sunX = 0.04 * w * zoom + offset.x;
    const sunY = 0.5 * h + offset.y;

    // ─── Shipping lane overlays ───────────────────────────────────
    if (showLanes) {
      ctx.lineWidth = 1;
      for (const lane of LANES) {
        const fromLayout = layoutOf(lane.from);
        const toLayout = layoutOf(lane.to);
        if (!fromLayout || !toLayout) continue;
        const unlockedBoth = state.unlockedLocations.includes(lane.from) && state.unlockedLocations.includes(lane.to);
        const fx = fromLayout.x * w * zoom + offset.x;
        const fy = fromLayout.y * h + offset.y;
        const tx = toLayout.x * w * zoom + offset.x;
        const ty = toLayout.y * h + offset.y;
        ctx.strokeStyle = unlockedBoth ? 'rgba(34,211,238,0.12)' : 'rgba(100,116,139,0.05)';
        ctx.setLineDash(unlockedBoth ? [] : [4, 4]);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // ─── Sun ──────────────────────────────────────────────────────
    const sunPulse = 1 + Math.sin(tSec * 0.5) * 0.04;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 70 * zoom * sunPulse);
    sunGrad.addColorStop(0, 'rgba(254,240,138,0.9)');
    sunGrad.addColorStop(0.25, 'rgba(251,191,36,0.5)');
    sunGrad.addColorStop(0.6, 'rgba(245,158,11,0.15)');
    sunGrad.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 70 * zoom * sunPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 13 * zoom * sunPulse, 0, Math.PI * 2);
    ctx.fill();

    // ─── Orbit lines (subtle) ─────────────────────────────────────
    ctx.strokeStyle = 'rgba(100,116,139,0.08)';
    ctx.lineWidth = 0.5;
    const drawnOrbits = new Set<number>();
    for (const loc of LOCATIONS) {
      const layout = layoutOf(loc.id);
      if (!layout) continue;
      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h + offset.y;
      const dist = Math.round(Math.sqrt(Math.pow(lx - sunX, 2) + Math.pow(ly - sunY, 2)));
      if (drawnOrbits.has(dist)) continue;
      drawnOrbits.add(dist);
      ctx.beginPath();
      ctx.arc(sunX, sunY, dist, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ─── Locations ────────────────────────────────────────────────
    const locationPx: Record<string, { x: number; y: number }> = {};
    for (const loc of LOCATIONS) {
      const layout = layoutOf(loc.id);
      if (!layout) continue;
      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h + offset.y;
      const r = layout.radius * zoom;
      locationPx[loc.id] = { x: lx, y: ly };

      const unlocked = state.unlockedLocations.includes(loc.id);
      const isSelected = selectedLoc === loc.id;
      const buildingsHere = state.buildings.filter(b => b.locationId === loc.id);
      const completedHere = buildingsHere.filter(b => b.isComplete).length;
      const npcCount = (state.npcCompanies || []).filter(n => n.unlockedLocations.includes(loc.id)).length;

      // Outer glow for unlocked locations
      if (unlocked) {
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 3);
        glow.addColorStop(0, `${layout.glowColor}70`);
        glow.addColorStop(0.4, `${layout.glowColor}20`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly, r * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Selection ring — animated pulse
      if (isSelected) {
        const pulse = 1 + Math.sin(tSec * 3) * 0.12;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lx, ly, (r + 6) * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Body with gradient for sphere feel
      const bodyGrad = ctx.createRadialGradient(lx - r * 0.3, ly - r * 0.3, 0, lx, ly, r);
      if (unlocked) {
        bodyGrad.addColorStop(0, lightenColor(layout.color, 30));
        bodyGrad.addColorStop(0.6, layout.color);
        bodyGrad.addColorStop(1, darkenColor(layout.color, 40));
      } else {
        bodyGrad.addColorStop(0, '#334155');
        bodyGrad.addColorStop(1, '#1e293b');
      }
      ctx.fillStyle = bodyGrad;
      ctx.globalAlpha = unlocked ? 1 : 0.45;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Saturn's rings (special-case)
      if (loc.id === 'saturn_system' && unlocked) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(0.3);
        ctx.strokeStyle = `${layout.glowColor}50`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.8, r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `${layout.glowColor}30`;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.1, r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Body outline
      ctx.strokeStyle = unlocked ? `${layout.color}a0` : '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label — bigger and bolder
      ctx.fillStyle = unlocked ? '#e2e8f0' : '#64748b';
      ctx.font = `${10 * zoom}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(loc.name, lx, ly + r + 14 * zoom);

      // Building count badge
      if (completedHere > 0) {
        const badgeX = lx + r * 0.7;
        const badgeY = ly - r * 0.7;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, 7 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${8 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(completedHere), badgeX, badgeY);
        ctx.textBaseline = 'alphabetic';
      }

      // NPC count badge
      if (npcCount > 0) {
        const npcBadgeX = lx - r * 0.7;
        const npcBadgeY = ly - r * 0.7;
        ctx.fillStyle = '#ef444470';
        ctx.beginPath();
        ctx.arc(npcBadgeX, npcBadgeY, 6 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fecaca';
        ctx.font = `bold ${7 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(npcCount), npcBadgeX, npcBadgeY);
        ctx.textBaseline = 'alphabetic';
      }

      // Small orbiting dots for player satellites
      if (completedHere > 0) {
        const time = tSec;
        for (let s = 0; s < Math.min(completedHere, 5); s++) {
          const angle = time * (0.5 + s * 0.3) + s * (Math.PI * 2 / 5);
          const orbitR = r + 4 + s * 2;
          const sx = lx + Math.cos(angle) * orbitR;
          const sy = ly + Math.sin(angle) * orbitR;
          ctx.fillStyle = '#22d3ee';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // ─── Ships in transit (player fleet) ──────────────────────────
    if (showShips) {
      const ships = state.ships || [];
      const nowMs = Date.now();
      for (const ship of ships) {
        if (!ship.isBuilt) continue;
        if (!ship.route || ship.status !== 'in_transit') {
          // Stationary ship — render a small chevron orbiting its current location
          const layout = layoutOf(ship.currentLocation);
          const px = locationPx[ship.currentLocation];
          if (!layout || !px) continue;
          const r = layout.radius * zoom;
          const def = SHIP_MAP.get(ship.definitionId);
          const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';
          const time = tSec;
          const angle = time * 0.8 + ship.instanceId.charCodeAt(0) * 0.1;
          const orbitR = r + 12 + (ship.instanceId.charCodeAt(1) % 6);
          const sx = px.x + Math.cos(angle) * orbitR;
          const sy = px.y + Math.sin(angle) * orbitR;
          drawShipMarker(ctx, sx, sy, angle + Math.PI / 2, color, 3.5 * zoom);
          continue;
        }
        // Interpolate position from departure → arrival
        const fromLayout = layoutOf(ship.route.from);
        const toLayout = layoutOf(ship.route.to);
        if (!fromLayout || !toLayout) continue;
        const depAt = ship.route.departedAtMs;
        const arrAt = ship.route.arrivalAtMs;
        const total = Math.max(1, arrAt - depAt);
        const t = Math.max(0, Math.min(1, (nowMs - depAt) / total));

        const fx = fromLayout.x * w * zoom + offset.x;
        const fy = fromLayout.y * h + offset.y;
        const tx = toLayout.x * w * zoom + offset.x;
        const ty = toLayout.y * h + offset.y;
        // Slight curved trajectory — midpoint lifted perpendicular to the chord
        const midX = (fx + tx) / 2;
        const midY = (fy + ty) / 2;
        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = len > 0 ? -dy / len : 0;
        const perpY = len > 0 ?  dx / len : 0;
        const bendAmount = Math.min(30, len * 0.08);
        const ctrlX = midX + perpX * bendAmount;
        const ctrlY = midY + perpY * bendAmount;
        // Quadratic bezier at parameter t
        const bx = (1 - t) * (1 - t) * fx + 2 * (1 - t) * t * ctrlX + t * t * tx;
        const by = (1 - t) * (1 - t) * fy + 2 * (1 - t) * t * ctrlY + t * t * ty;
        // Tangent for heading
        const tanX = 2 * (1 - t) * (ctrlX - fx) + 2 * t * (tx - ctrlX);
        const tanY = 2 * (1 - t) * (ctrlY - fy) + 2 * t * (ty - ctrlY);
        const heading = Math.atan2(tanY, tanX);

        // Trail
        ctx.strokeStyle = 'rgba(34,211,238,0.25)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo(ctrlX, ctrlY, bx, by);
        ctx.stroke();

        // Ship marker
        const def = SHIP_MAP.get(ship.definitionId);
        const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';
        drawShipMarker(ctx, bx, by, heading, color, 4 * zoom);
      }
    }

    // ─── Recent hazard indicators ────────────────────────────────
    const recent = (state.recentHazards || []).filter(h => Date.now() - h.occurredAtMs < 60_000);
    for (const h of recent) {
      const px = locationPx[h.locationId];
      if (!px) continue;
      const age = (Date.now() - h.occurredAtMs) / 60_000; // 0-1
      const radius = 10 + age * 30;
      ctx.strokeStyle = h.destroyed ? `rgba(239,68,68,${1 - age})` : `rgba(251,191,36,${1 - age})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px.x, px.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [state, selectedLoc, offset, zoom, starfield, showLanes, showShips, layoutOf]);

  // Canvas sizing — re-scale on container resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Animation loop
  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Click detection
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    for (const loc of LOCATIONS) {
      const layout = LOCATION_LAYOUT[loc.id];
      if (!layout) continue;
      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h + offset.y;
      const r = layout.radius * zoom + 10;
      const dist = Math.sqrt(Math.pow(mx - lx, 2) + Math.pow(my - ly, 2));
      if (dist < r) {
        playSound('click');
        setSelectedLoc(prev => prev === loc.id ? null : loc.id);
        return;
      }
    }
    setSelectedLoc(null);
  }, [zoom, offset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(3, prev - e.deltaY * 0.001)));
  };

  // Selected location details
  const selectedLocData = selectedLoc ? LOCATIONS.find(l => l.id === selectedLoc) : null;
  const isUnlocked = selectedLoc ? state.unlockedLocations.includes(selectedLoc) : false;
  const buildingsAtSelected = selectedLoc ? state.buildings.filter(b => b.locationId === selectedLoc) : [];
  const npcCountAtSelected = selectedLoc ? (state.npcCompanies || []).filter(n => n.unlockedLocations.includes(selectedLoc)).length : 0;
  const canUnlock = selectedLocData && !isUnlocked && selectedLocData.requiredResearch.every(r => state.completedResearch.includes(r)) && state.money >= selectedLocData.unlockCost;
  const shipsAtSelected = selectedLoc ? (state.ships || []).filter(s => s.isBuilt && s.currentLocation === selectedLoc) : [];
  const shipsInTransit = (state.ships || []).filter(s => s.isBuilt && s.status === 'in_transit');

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-white/[0.06] overflow-hidden bg-[#050510]"
        style={{ height: '460px', cursor: dragging ? 'grabbing' : 'grab' }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full"
        />

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-7 h-7 rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in">+</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-7 h-7 rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out">−</button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="w-7 h-7 rounded bg-black/60 text-white text-[9px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view">⟲</button>
        </div>

        {/* Layer toggles */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <button
            onClick={() => setShowLanes(v => !v)}
            className={`px-2 py-1 rounded text-[9px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showLanes ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showLanes ? '● Lanes' : '○ Lanes'}
          </button>
          <button
            onClick={() => setShowShips(v => !v)}
            className={`px-2 py-1 rounded text-[9px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              showShips ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {showShips ? '● Ships' : '○ Ships'}
          </button>
        </div>

        {/* Legend + activity */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 text-[9px] text-slate-400">
          <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Your buildings
          </span>
          <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> NPC presence
          </span>
          <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Mining ship
          </span>
          <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Survey ship
          </span>
          {shipsInTransit.length > 0 && (
            <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm text-emerald-300">
              ⚡ {shipsInTransit.length} in transit
            </span>
          )}
        </div>
      </div>

      {/* Selected Location Details */}
      {selectedLocData && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold text-sm">{selectedLocData.name}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{selectedLocData.description}</p>
              {isUnlocked && (
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="text-cyan-400">{buildingsAtSelected.filter(b => b.isComplete).length} buildings</span>
                  {buildingsAtSelected.filter(b => !b.isComplete).length > 0 && (
                    <span className="text-amber-400">{buildingsAtSelected.filter(b => !b.isComplete).length} building</span>
                  )}
                  {shipsAtSelected.length > 0 && (
                    <span className="text-purple-300">{shipsAtSelected.length} ship{shipsAtSelected.length === 1 ? '' : 's'}</span>
                  )}
                </div>
              )}
              {!isUnlocked && (
                <div className="mt-2 text-xs">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Requirements to unlock</div>
                  <ul className="space-y-0.5 text-slate-400 pl-4" style={{ listStyle: 'disc' }}>
                    <li>Pay <span className="text-white font-mono">{formatMoney(selectedLocData.unlockCost)}</span></li>
                    {selectedLocData.requiredResearch.length > 0 && (
                      <li>Research: {selectedLocData.requiredResearch.map(r => r.replace(/_/g, ' ')).join(', ')}</li>
                    )}
                  </ul>
                </div>
              )}
              {npcCountAtSelected > 0 && (
                <div className="mt-2 text-[10px] text-slate-500 italic">
                  🤖 {npcCountAtSelected} NPC {npcCountAtSelected === 1 ? 'competitor already operates' : 'competitors already operate'} here — informational only, not a gate
                </div>
              )}
            </div>
            <div>
              {isUnlocked ? (
                <span className="text-green-400 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">Unlocked</span>
              ) : canUnlock ? (
                <button
                  onClick={() => { playSound('location_unlock'); onUnlock(selectedLoc!); }}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  Unlock {formatMoney(selectedLocData.unlockCost)}
                </button>
              ) : (
                <span className="text-slate-500 text-xs px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">Locked</span>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-slate-600 text-[10px] text-center">Click a location to see details. Drag to pan, scroll to zoom. Toggle lanes and ships with the top-left buttons.</p>
    </div>
  );
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawShipMarker(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, color: string, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  // Chevron shape
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size * 1.4, 0);
  ctx.lineTo(-size * 0.8, -size * 0.8);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.8, size * 0.8);
  ctx.closePath();
  ctx.fill();
  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(size * 1.4, 0);
  ctx.lineTo(-size * 0.8, -size * 0.8);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.8, size * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function lightenColor(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * pct / 100));
  const lg = Math.min(255, Math.round(g + (255 - g) * pct / 100));
  const lb = Math.min(255, Math.round(b + (255 - b) * pct / 100));
  return `rgb(${lr},${lg},${lb})`;
}

function darkenColor(hex: string, pct: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const lr = Math.max(0, Math.round(r * (1 - pct / 100)));
  const lg = Math.max(0, Math.round(g * (1 - pct / 100)));
  const lb = Math.max(0, Math.round(b * (1 - pct / 100)));
  return `rgb(${lr},${lg},${lb})`;
}
