'use client';

import { useEffect, useRef } from 'react';

/**
 * StardustLayer — full-window fixed canvas rendering slow-drifting dust motes
 * and occasional lens-flare streaks behind the game UI. Non-interactive, very
 * low opacity, honours prefers-reduced-motion.
 *
 * The canvas is pinned to z-index 1 (above the page background, below all
 * game chrome). ~200 motes give the eye something to track without ever
 * reading as clutter.
 */
export default function StardustLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Honour accessibility preference — render a still field, no animation.
    const prefersReduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const DPR = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(DPR, DPR);
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Generate stable mote + flare fields ─────────────────────────────
    type Mote = { x: number; y: number; vx: number; vy: number; r: number; alpha: number };
    const motes: Mote[] = [];
    for (let i = 0; i < 220; i++) {
      motes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        // Very slow drift — 0.02-0.08 px/frame. Anything faster reads as falling snow.
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() * 0.08) - 0.02,
        r: Math.random() * 1.1 + 0.3,
        alpha: Math.random() * 0.35 + 0.05,
      });
    }

    type Flare = { x: number; y: number; life: number; maxLife: number; hue: number };
    const flares: Flare[] = [];

    function spawnFlare() {
      // 8-12 second cadence. A flare lives 2.5-4s.
      flares.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.6,
        life: 0,
        maxLife: 2500 + Math.random() * 1500,
        hue: Math.random() < 0.5 ? 190 : 260, // cyan or violet
      });
    }

    const flareTimer = prefersReduced ? null : setInterval(spawnFlare, 9000 + Math.random() * 4000);
    // First flare ~4s after mount so the screen isn't blank on load.
    const flareKickoff = prefersReduced ? null : setTimeout(spawnFlare, 4000);

    let lastT = performance.now();

    function frame(t: number) {
      const dt = Math.min(50, t - lastT); // clamp big gaps (background tab)
      lastT = t;
      ctx!.clearRect(0, 0, w, h);

      // ── Motes ───────────────────────────────────────────────────────
      for (const m of motes) {
        if (!prefersReduced) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.x < -2) m.x = w + 2;
          if (m.x > w + 2) m.x = -2;
          if (m.y < -2) m.y = h + 2;
          if (m.y > h + 2) m.y = -2;
        }
        ctx!.fillStyle = `rgba(180, 220, 255, ${m.alpha})`;
        ctx!.beginPath();
        ctx!.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // ── Flares (soft radial streaks) ────────────────────────────────
      for (let i = flares.length - 1; i >= 0; i--) {
        const f = flares[i];
        f.life += dt;
        if (f.life > f.maxLife) { flares.splice(i, 1); continue; }
        const progress = f.life / f.maxLife;
        // Fade in/out on a sine curve so it swells and ebbs.
        const intensity = Math.sin(progress * Math.PI) * 0.18;
        const radius = 120 + progress * 60;
        const grad = ctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        grad.addColorStop(0, `hsla(${f.hue}, 100%, 75%, ${intensity})`);
        grad.addColorStop(0.5, `hsla(${f.hue}, 100%, 55%, ${intensity * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (flareTimer) clearInterval(flareTimer);
      if (flareKickoff) clearTimeout(flareKickoff);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1, mixBlendMode: 'screen', opacity: 0.55 }}
    />
  );
}
