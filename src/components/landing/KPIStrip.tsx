'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { formatCompact } from '@/lib/format-number';
import { SITE_STATS } from '@/lib/site-stats';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface KPIMetric {
  label: string;
  value: number;
  suffix: string;
  prefix: string;
  colorClass: string;
  /** When set, the KPI tile is a link to this destination. */
  href?: string;
}

/**
 * Parse a SITE_STATS display string (e.g. '10,000+', '$630B', '26') into an
 * animatable numeric value plus prefix/suffix, so the strip always renders
 * the canonical platform statistics.
 */
function parseStat(stat: string): { value: number; prefix: string; suffix: string } {
  const match = stat.match(/^(\$?)([\d,.]+)(.*)$/);
  if (!match) return { value: 0, prefix: '', suffix: stat };
  return {
    value: parseFloat(match[2].replace(/,/g, '')),
    prefix: match[1],
    suffix: match[3],
  };
}

const KPI_METRICS: KPIMetric[] = [
  // Satellites tracked lives in the hero's live dashboard; showing it twice on
  // the landing page was the founder's call to drop (2026-08-29).
  { label: 'Automated Data Feeds', ...parseStat(SITE_STATS.automatedFeeds), colorClass: 'text-emerald-400' },
  { label: 'Company Profiles', ...parseStat(SITE_STATS.companies), colorClass: 'text-white' },
  { label: 'Space Economy', ...parseStat(SITE_STATS.spaceEconomyNow), colorClass: 'text-emerald-400' },
  { label: 'Original Articles', ...parseStat(SITE_STATS.articles), colorClass: 'text-white' },
  { label: 'Job Listings', ...parseStat(SITE_STATS.jobListings), colorClass: 'text-cyan-400', href: '/space-talent' },
  { label: 'Data Sources', ...parseStat(SITE_STATS.dataSources), colorClass: 'text-white' },
];

function formatNumber(value: number, prefix: string, suffix: string): string {
  if (prefix === '$' && (suffix === 'T' || suffix === 'B')) {
    return `${prefix}${Math.round(value)}${suffix}`;
  }
  if (value >= 1e6) return `${prefix}${formatCompact(value)}${suffix}`;
  return `${prefix}${Math.round(value).toLocaleString('en-US')}${suffix}`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function AnimatedCounter({ metric, shouldAnimate }: { metric: KPIMetric; shouldAnimate: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const hasAnimated = useRef(false);

  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!shouldAnimate || hasAnimated.current) return;
    hasAnimated.current = true;
    if (reducedMotion) { setDisplayValue(metric.value); return; }

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
  }, [shouldAnimate, metric.value, reducedMotion]);

  const formatted = formatNumber(displayValue, metric.prefix, metric.suffix);

  const content = (
    <>
      <span className={`text-xl md:text-2xl font-bold font-mono tabular-nums ${metric.colorClass} transition-[filter] duration-300 group-hover/kpi:drop-shadow-[0_0_8px_currentColor]`}>
        {formatted}
      </span>
      <span className="text-[10px] md:text-xs text-slate-500 mt-1 font-medium whitespace-nowrap uppercase tracking-wider">
        {metric.label}
      </span>
    </>
  );

  if (metric.href) {
    return (
      <Link
        href={metric.href}
        aria-label={`View ${metric.label}: ${formatted}`}
        className="group/kpi flex flex-col items-center text-center px-2 py-3 md:py-4 transition-colors duration-200 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="group/kpi flex flex-col items-center text-center px-2 py-3 md:py-4 transition-colors duration-200 hover:bg-white/[0.02] cursor-default">
      {content}
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
        <div className="card-terminal">
          <div className="card-terminal__header">
            <div className="flex items-center gap-2">
              <div className="card-terminal__dots">
                <div className="card-terminal__dot card-terminal__dot--red" />
                <div className="card-terminal__dot card-terminal__dot--amber" />
                <div className="card-terminal__dot card-terminal__dot--green" />
              </div>
              <span className="card-terminal__path">spacenexus:~/platform-stats</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-semibold">Platform</span>
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
