'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatCompact } from '@/lib/format-number';

interface KPIMetric {
  label: string;
  value: number;
  suffix: string;
  prefix: string;
  colorClass: string;
}

const KPI_METRICS: KPIMetric[] = [
  {
    label: 'Launches YTD',
    value: 42,
    suffix: '',
    prefix: '',
    colorClass: 'text-slate-300',
  },
  {
    label: 'Active Satellites',
    value: 7500,
    suffix: '+',
    prefix: '',
    colorClass: 'text-emerald-400',
  },
  {
    label: 'Companies Tracked',
    value: 15000,
    suffix: '+',
    prefix: '',
    colorClass: 'text-amber-400',
  },
  {
    label: 'Market Cap',
    value: 1.2,
    suffix: 'T',
    prefix: '$',
    colorClass: 'text-slate-300',
  },
  {
    label: 'Funding YTD',
    value: 8.2,
    suffix: 'B',
    prefix: '$',
    colorClass: 'text-emerald-400',
  },
  {
    label: 'Space Agencies',
    value: 77,
    suffix: '+',
    prefix: '',
    colorClass: 'text-amber-400',
  },
];

function formatNumber(value: number, prefix: string, suffix: string): string {
  // For values that already carry their own suffix (e.g. "$1.2T", "$8.2B"),
  // keep the existing format to preserve the intended display.
  if (prefix === '$' && (suffix === 'T' || suffix === 'B')) {
    return `${prefix}${value.toFixed(1)}${suffix}`;
  }
  // Delegate to the shared formatCompact utility for everything else
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

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [shouldAnimate, metric.value]);

  const formatted = formatNumber(displayValue, metric.prefix, metric.suffix);

  return (
    <div className="group/kpi flex flex-col items-center text-center px-2 py-3 md:py-4 transition-colors duration-200 hover:bg-white/[0.02] cursor-default">
      <span
        className={`text-2xl md:text-3xl font-bold tabular-nums ${metric.colorClass} animate-pulse-subtle group-hover/kpi:drop-shadow-[0_0_8px_currentColor] transition-[filter] duration-300`}
      >
        {formatted}
      </span>
      <span className="text-xs md:text-sm text-slate-400 mt-1 font-medium whitespace-nowrap group-hover/kpi:text-slate-300 transition-colors duration-200">
        {metric.label}
      </span>
    </div>
  );
}

export default function KPIStrip() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Check if already visible (above-the-fold on page load)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.2,
      rootMargin: '0px',
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersection]);

  return (
    <section
      ref={containerRef}
      className="py-6 md:py-8 relative z-10"
    >
      <div className="container mx-auto px-4">
        <div
          className="rounded-2xl border border-slate-700/50 backdrop-blur-sm overflow-hidden"
          style={{
            background:
              'linear-gradient(145deg, rgba(30, 41, 59, 0.5) 0%, rgba(51, 65, 85, 0.3) 50%, rgba(30, 41, 59, 0.5) 100%)',
          }}
        >
          <div className="overflow-x-auto md:overflow-x-visible scrollbar-hide">
            <div className="grid grid-cols-3 md:grid-cols-6 min-w-0 divide-x divide-slate-700/30">
              {KPI_METRICS.map((metric) => (
                <AnimatedCounter
                  key={metric.label}
                  metric={metric}
                  shouldAnimate={isVisible}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scoped keyframes for subtle pulse */}
      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        :global(.animate-pulse-subtle) {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
