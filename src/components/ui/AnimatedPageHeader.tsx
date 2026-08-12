'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';
import Link from 'next/link';

/** Map breadcrumb labels to their routes */
const BREADCRUMB_ROUTES: Record<string, string> = {
  'Dashboard': '/dashboard',
  'News & Media': '/news',
  'Intelligence': '/market-intel',
  'Business': '/business-opportunities',
  'Tools': '/tools',
  'Explore': '/features',
  'Market Intel': '/market-intel',
  'Company Profiles': '/company-profiles',
  'Marketplace': '/marketplace',
  'Compliance': '/compliance',
  'Space Talent': '/space-talent',
  'Mission Planning': '/mission-cost',
  'Space Operations': '/satellites',
  'Solar System': '/solar-exploration',
  'Space Environment': '/space-environment',
};

/**
 * Static accent style lookup. Tailwind's JIT compiler requires full literal
 * class strings (no template interpolation), so each accent is spelled out.
 * `green` intentionally maps to the emerald styles to collapse the duplicate.
 */
const ACCENT_STYLES: Record<string, { bar: string; iconBox: string }> = {
  cyan: {
    bar: 'bg-gradient-to-r from-cyan-400/80 to-transparent',
    iconBox: 'bg-cyan-400/10 ring-cyan-400/20',
  },
  purple: {
    bar: 'bg-gradient-to-r from-purple-400/80 to-transparent',
    iconBox: 'bg-purple-400/10 ring-purple-400/20',
  },
  amber: {
    bar: 'bg-gradient-to-r from-amber-400/80 to-transparent',
    iconBox: 'bg-amber-400/10 ring-amber-400/20',
  },
  emerald: {
    bar: 'bg-gradient-to-r from-emerald-400/80 to-transparent',
    iconBox: 'bg-emerald-400/10 ring-emerald-400/20',
  },
  red: {
    bar: 'bg-gradient-to-r from-red-400/80 to-transparent',
    iconBox: 'bg-red-400/10 ring-red-400/20',
  },
  green: {
    bar: 'bg-gradient-to-r from-emerald-400/80 to-transparent',
    iconBox: 'bg-emerald-400/10 ring-emerald-400/20',
  },
  blue: {
    bar: 'bg-gradient-to-r from-blue-400/80 to-transparent',
    iconBox: 'bg-blue-400/10 ring-blue-400/20',
  },
  indigo: {
    bar: 'bg-gradient-to-r from-indigo-400/80 to-transparent',
    iconBox: 'bg-indigo-400/10 ring-indigo-400/20',
  },
};

interface AnimatedPageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumb?: string;
  accentColor?: string;
  children?: ReactNode;
}

export default function AnimatedPageHeader({
  title,
  subtitle,
  icon,
  breadcrumb,
  accentColor = 'cyan',
  children,
}: AnimatedPageHeaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const accent = ACCENT_STYLES[accentColor] ?? ACCENT_STYLES.cyan;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // If IntersectionObserver is not available, show immediately
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    // Check if already in viewport (headers are typically above-the-fold)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build child index for stagger delays
  // Order: breadcrumb (if present), title row, subtitle (if present), children (if present)
  let delayIndex = 0;

  const breadcrumbDelay = breadcrumb ? delayIndex++ : -1;
  const titleDelay = delayIndex++;
  const subtitleDelay = subtitle ? delayIndex++ : -1;
  const childrenDelay = children ? delayIndex++ : -1;

  const delayClass = (idx: number) =>
    idx === 0 ? '' : idx === 1 ? 'reveal-delay-1' : idx === 2 ? 'reveal-delay-2' : 'reveal-delay-3';

  return (
    <div ref={containerRef} className="mb-10">
      {breadcrumb && (
        <nav
          aria-label="Breadcrumb"
          className={`text-sm text-slate-400 mb-2 tracking-wide uppercase ${
            visible ? `animate-reveal-up ${delayClass(breadcrumbDelay)}` : 'opacity-0'
          }`}
        >
          <ol className="flex items-center gap-1.5">
            {breadcrumb.split('→').map((segment, i, arr) => {
              const label = segment.trim();
              const route = BREADCRUMB_ROUTES[label];
              const isLast = i === arr.length - 1;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-slate-600">→</span>}
                  {!isLast && route ? (
                    <Link href={route} className="hover:text-white transition-colors">{label}</Link>
                  ) : (
                    <span className={isLast ? 'text-white/70' : ''}>{label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      <div
        className={`flex items-center gap-4 ${
          visible ? `animate-reveal-up-lg ${delayClass(titleDelay)}` : 'opacity-0'
        }`}
      >
        {icon && (
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl ring-1 ${accent.iconBox}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-100">
            {title}
          </h1>
          <div className={`mt-2 h-0.5 w-16 rounded-full ${accent.bar}`} aria-hidden="true" />
        </div>
      </div>

      {subtitle && (
        <p
          className={`mt-3 text-lg text-white/70 max-w-3xl leading-relaxed ${
            visible ? `animate-reveal-up-lg ${delayClass(subtitleDelay)}` : 'opacity-0'
          }`}
        >
          {subtitle}
        </p>
      )}

      {children && (
        <div
          className={`mt-4 ${
            visible ? `animate-reveal-up ${delayClass(childrenDelay)}` : 'opacity-0'
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
