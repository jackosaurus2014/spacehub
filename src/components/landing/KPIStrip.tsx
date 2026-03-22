'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatCompact } from '@/lib/format-number';

interface KPIMetric {
  label: string;
  value: number;
  suffix: string;
  prefix: string;
  change: string;
  changeUp: boolean;
  colorClass: string;
}

const KPI_METRICS: KPIMetric[] = [
  { label: 'Launches YTD', value: 42, suffix: '', prefix: '', change: '+18% YoY', changeUp: true, colorClass: 'text-white' },
  { label: 'Active Satellites', value: 10200, suffix: '+', prefix: '', change: '+12%', changeUp: true, colorClass: 'text-emerald-400' },
  { label: 'Companies Tracked', value: 15000, suffix: '+', prefix: '', change: '+6%', changeUp: true, colorClass: 'text-white' },
  { label: 'Space Economy', value: 546, suffix: 'B', prefix: '$', change: '+8.2%', changeUp: true, colorClass: 'text-emerald-400' },
  { label: 'VC Funding YTD', value: 2.1, suffix: 'B', prefix: '$', change: '+12% QoQ', changeUp: true, colorClass: 'text-white' },
  { label: 'Space Agencies', value: 77, suffix: '+', prefix: '', change: '+3 new', changeUp: true, colorClass: 'text-amber-400' },
];

function formatNumber(value: number, prefix: string, suffix: string): string {
  if (prefix === '$' && (suffix === 'T' || suffix === 'B')) {
    return `${prefix}${value.toFixed(1)}${suffix}`;
  }
  return `${prefix}${formatCompact(value)}${suffix}`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedCounter({ metric, shouldAnimate }: { metric: KPIMetric; shouldAnimate: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!shouldAnimate || hasAnimated.current) return;
    hasAnimated.current = true;

    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      setDisplayValue(easedProgress * metric.value);
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(metric.value);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => { if (animationRef.current !== null) cancelAnimationFrame(animationRef.current); };
  }, [shouldAnimate, metric.value]);

  const formatted = formatNumber(displayValue, metric.prefix, metric.suffix);

  return (
    <div className="group/kpi flex flex-col items-center text-center px-2 py-3 md:py-4 transition-colors duration-200 hover:bg-white/[0.02] cursor-default">
      <span className={`text-xl md:text-2xl font-bold font-mono tabular-nums ${metric.colorClass} transition-[filter] duration-300 group-hover/kpi:drop-shadow-[0_0_8px_currentColor]`}>
        {formatted}
      </span>
      <span className="text-[10px] md:text-xs text-slate-500 mt-1 font-medium whitespace-nowrap uppercase tracking-wider">
        {metric.label}
      </span>
      <span className={`text-[9px] font-semibold mt-0.5 ${metric.changeUp ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
        {metric.changeUp ? '▲' : '▼'} {metric.change}
      </span>
    </div>
  );
}

export default function KPIStrip() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(handleIntersection, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <section ref={containerRef} className="py-4 md:py-6 relative z-10">
      <div className="container mx-auto px-4">
        <div className="card-glass overflow-hidden">
          {/* Terminal header bar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/40" />
                <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
              </div>
              <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-mono">spacenexus:~/market-data</span>
            </div>
            <span className="live-badge text-[7px]">LIVE</span>
          </div>
          <div className="overflow-x-auto md:overflow-x-visible scrollbar-hide">
            <div className="grid grid-cols-3 md:grid-cols-6 min-w-0 divide-x divide-white/[0.04]">
              {KPI_METRICS.map((metric) => (
                <AnimatedCounter key={metric.label} metric={metric} shouldAnimate={isVisible} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
