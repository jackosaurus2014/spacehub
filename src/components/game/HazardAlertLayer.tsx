'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { playSound } from '@/lib/game/sound-engine';

/**
 * HazardAlertLayer — watches state.recentHazards for newly-appended entries
 * and triggers AAA-style reaction: (1) a screen-edge flash tinted by severity,
 * and (2) a sliding HUD alert banner near the top-right.
 *
 * The banner is a live region so screen readers announce the incident without
 * needing any visual flash. Respects prefers-reduced-motion.
 */

interface HazardAlertLayerProps {
  state: GameState;
}

type AlertEntry = {
  id: string;
  title: string;
  detail: string;
  severity: 'warning' | 'loss';
  createdAtMs: number;
};

const HAZARD_META: Record<string, { label: string; icon: string }> = {
  solar_storm:        { label: 'Solar storm',        icon: '☀' },
  micrometeorite:     { label: 'Micrometeorite',     icon: '☄' },
  pirate_raid:        { label: 'Pirate raid',        icon: '⚔' },
  equipment_failure:  { label: 'Equipment failure',  icon: '⚙' },
};

export default function HazardAlertLayer({ state }: HazardAlertLayerProps) {
  const seenIds = useRef<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [flash, setFlash] = useState<'warning' | 'loss' | null>(null);

  // Seed seen set with the first snapshot so returning players don't see a
  // flood of historical hazards replayed on mount.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    for (const h of state.recentHazards || []) seenIds.current.add(h.id);
  }, [state.recentHazards]);

  useEffect(() => {
    const hazards = state.recentHazards || [];
    const fresh: AlertEntry[] = [];
    for (const h of hazards) {
      if (seenIds.current.has(h.id)) continue;
      seenIds.current.add(h.id);
      const meta = HAZARD_META[h.type] || { label: h.type, icon: '⚠' };
      const loc = LOCATION_MAP.get(h.locationId);
      const severity: 'warning' | 'loss' = h.destroyed ? 'loss' : 'warning';
      fresh.push({
        id: h.id,
        title: `${meta.icon}  ${meta.label.toUpperCase()}`,
        detail: h.destroyed
          ? `Asset lost at ${loc?.name || h.locationId}`
          : `${Math.round(h.damagePct * 100)}% damage at ${loc?.name || h.locationId}${
              h.insurancePayout > 0 ? ` · Insurance ${Math.round(h.insurancePayout / 1_000_000)}M` : ''
            }`,
        severity,
        createdAtMs: Date.now(),
      });
    }
    if (fresh.length > 0) {
      // Fire screen flash on the most severe incident in this tick.
      const worst: 'warning' | 'loss' = fresh.some(a => a.severity === 'loss') ? 'loss' : 'warning';
      setFlash(worst);
      playSound(worst === 'loss' ? 'rival_overtake' : 'notification');
      window.setTimeout(() => setFlash(null), 650);
      setAlerts(prev => [...prev, ...fresh].slice(-5));
    }
  }, [state.recentHazards]);

  // Auto-dismiss individual banners after 6s.
  useEffect(() => {
    if (alerts.length === 0) return;
    const t = window.setTimeout(() => {
      setAlerts(prev => prev.slice(1));
    }, 6000);
    return () => window.clearTimeout(t);
  }, [alerts]);

  return (
    <>
      {/* Screen-edge flash — rectangular ring of colored light */}
      {flash && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[55] hazard-flash"
          style={{
            boxShadow: flash === 'loss'
              ? 'inset 0 0 120px 20px rgba(239,68,68,0.55), inset 0 0 400px 80px rgba(239,68,68,0.25)'
              : 'inset 0 0 120px 20px rgba(245,158,11,0.45), inset 0 0 400px 80px rgba(245,158,11,0.18)',
          }}
        />
      )}

      {/* HUD alert stack — top-right, each alert slides in */}
      <div
        className="pointer-events-none fixed top-20 right-4 z-[60] flex flex-col gap-2 items-end"
        role="status"
        aria-live="polite"
      >
        {alerts.map(a => (
          <div
            key={a.id}
            className={`hazard-alert-banner hud-frame relative px-3 py-2 rounded-md border backdrop-blur-md text-xs ${
              a.severity === 'loss'
                ? 'bg-red-900/70 border-red-500/50 text-red-100'
                : 'bg-amber-900/70 border-amber-500/50 text-amber-100'
            }`}
            style={{
              ['--hud-color' as string]: a.severity === 'loss' ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.6)',
            }}
          >
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="font-hud font-bold tracking-widest">{a.title}</div>
            <div className="text-[11px] opacity-90 mt-0.5 max-w-[260px]">{a.detail}</div>
          </div>
        ))}
      </div>
    </>
  );
}
