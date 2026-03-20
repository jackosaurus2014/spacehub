'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { LOCATIONS } from '@/lib/game/solar-system';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface SolarSystemCanvasProps {
  state: GameState;
  onUnlock: (locId: string) => void;
}

// Visual layout: horizontal positions for each location (0-1 range)
const LOCATION_LAYOUT: Record<string, { x: number; y: number; radius: number; color: string; emoji: string }> = {
  earth_surface: { x: 0.18, y: 0.50, radius: 22, color: '#22c55e', emoji: '🌍' },
  leo:           { x: 0.22, y: 0.35, radius: 10, color: '#06b6d4', emoji: '🛰️' },
  geo:           { x: 0.26, y: 0.65, radius: 10, color: '#8b5cf6', emoji: '📡' },
  lunar_orbit:   { x: 0.34, y: 0.38, radius: 9, color: '#94a3b8', emoji: '🌙' },
  lunar_surface: { x: 0.34, y: 0.58, radius: 14, color: '#d1d5db', emoji: '🌑' },
  mars_orbit:    { x: 0.48, y: 0.40, radius: 9, color: '#f97316', emoji: '🔴' },
  mars_surface:  { x: 0.48, y: 0.60, radius: 14, color: '#dc2626', emoji: '🔴' },
  asteroid_belt: { x: 0.60, y: 0.50, radius: 12, color: '#a8a29e', emoji: '☄️' },
  jupiter_system:{ x: 0.72, y: 0.45, radius: 18, color: '#f59e0b', emoji: '🪐' },
  saturn_system: { x: 0.84, y: 0.55, radius: 16, color: '#eab308', emoji: '🪐' },
  outer_system:  { x: 0.94, y: 0.50, radius: 12, color: '#6366f1', emoji: '🌌' },
};

export default function SolarSystemCanvas({ state, onUnlock }: SolarSystemCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const animRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    // Stars
    const starSeed = 42;
    for (let i = 0; i < 120; i++) {
      const sx = ((Math.sin(i * 7 + starSeed) * 10000) % 1 + 1) % 1 * w;
      const sy = ((Math.sin(i * 13 + starSeed + 3) * 10000) % 1 + 1) % 1 * h;
      const size = 0.3 + ((Math.sin(i * 17 + starSeed) * 10000) % 1 + 1) % 1 * 1.2;
      const alpha = 0.1 + ((Math.sin(i * 23 + Date.now() * 0.001) + 1) / 2) * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sun glow
    const sunX = 0.06 * w * zoom + offset.x;
    const sunY = 0.5 * h + offset.y;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 50 * zoom);
    sunGrad.addColorStop(0, 'rgba(250,204,21,0.8)');
    sunGrad.addColorStop(0.3, 'rgba(250,204,21,0.3)');
    sunGrad.addColorStop(1, 'rgba(250,204,21,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Sun core
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 12 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Draw orbit lines (faint arcs from sun)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (const loc of LOCATIONS) {
      const layout = LOCATION_LAYOUT[loc.id];
      if (!layout) continue;
      const dist = Math.sqrt(Math.pow((layout.x * w * zoom + offset.x) - sunX, 2) + Math.pow((layout.y * h + offset.y) - sunY, 2));
      ctx.beginPath();
      ctx.arc(sunX, sunY, dist, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw locations
    for (const loc of LOCATIONS) {
      const layout = LOCATION_LAYOUT[loc.id];
      if (!layout) continue;

      const lx = layout.x * w * zoom + offset.x;
      const ly = layout.y * h + offset.y;
      const r = layout.radius * zoom;
      const unlocked = state.unlockedLocations.includes(loc.id);
      const isSelected = selectedLoc === loc.id;
      const buildingsHere = state.buildings.filter(b => b.locationId === loc.id);
      const completedHere = buildingsHere.filter(b => b.isComplete).length;

      // NPC presence
      const npcCount = (state.npcCompanies || []).filter(n => n.unlockedLocations.includes(loc.id)).length;

      // Location glow
      if (unlocked) {
        const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 2.5);
        glow.addColorStop(0, `${layout.color}30`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(lx, ly, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(lx, ly, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Planet body
      ctx.fillStyle = unlocked ? layout.color : '#1e293b';
      ctx.globalAlpha = unlocked ? 1 : 0.4;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Border
      ctx.strokeStyle = unlocked ? `${layout.color}80` : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label
      ctx.fillStyle = unlocked ? '#ffffff' : '#64748b';
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
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(npcBadgeX, npcBadgeY, 6 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${7 * zoom}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(npcCount), npcBadgeX, npcBadgeY);
        ctx.textBaseline = 'alphabetic';
      }

      // Small orbiting dots for player satellites
      if (completedHere > 0) {
        const time = Date.now() * 0.001;
        for (let s = 0; s < Math.min(completedHere, 5); s++) {
          const angle = time * (0.5 + s * 0.3) + s * (Math.PI * 2 / 5);
          const orbitR = r + 3 + s * 2;
          const sx = lx + Math.cos(angle) * orbitR;
          const sy = ly + Math.sin(angle) * orbitR;
          ctx.fillStyle = '#06b6d4';
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5 * zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [state, selectedLoc, offset, zoom]);

  // Canvas sizing
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

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  // Zoom
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

  return (
    <div className="space-y-3">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-white/[0.06] overflow-hidden bg-[#050510]"
        style={{ height: '400px', cursor: dragging ? 'grabbing' : 'grab' }}
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
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-7 h-7 rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10">+</button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="w-7 h-7 rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10">−</button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="w-7 h-7 rounded bg-black/60 text-white text-[9px] hover:bg-white/10 border border-white/10">⟲</button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex gap-3 text-[9px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Your buildings</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> NPC presence</span>
        </div>
      </div>

      {/* Selected Location Details */}
      {selectedLocData && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-white font-semibold text-sm">{selectedLocData.name}</h3>
              <p className="text-slate-400 text-xs mt-0.5">{selectedLocData.description}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                {isUnlocked && (
                  <>
                    <span className="text-cyan-400">{buildingsAtSelected.filter(b => b.isComplete).length} buildings</span>
                    {buildingsAtSelected.filter(b => !b.isComplete).length > 0 && (
                      <span className="text-amber-400">{buildingsAtSelected.filter(b => !b.isComplete).length} building</span>
                    )}
                  </>
                )}
                {npcCountAtSelected > 0 && (
                  <span className="text-red-400/70">🤖 {npcCountAtSelected} NPC{npcCountAtSelected > 1 ? 's' : ''}</span>
                )}
              </div>
              {!isUnlocked && (
                <div className="mt-2 text-xs text-slate-500">
                  <span>Unlock cost: {formatMoney(selectedLocData.unlockCost)}</span>
                  {selectedLocData.requiredResearch.length > 0 && (
                    <span className="ml-2">Requires: {selectedLocData.requiredResearch.join(', ').replace(/_/g, ' ')}</span>
                  )}
                </div>
              )}
            </div>
            <div>
              {isUnlocked ? (
                <span className="text-green-400 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">Unlocked</span>
              ) : canUnlock ? (
                <button
                  onClick={() => { playSound('location_unlock'); onUnlock(selectedLoc!); }}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
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

      <p className="text-slate-600 text-[10px] text-center">Click a location to see details. Drag to pan, scroll to zoom.</p>
    </div>
  );
}
