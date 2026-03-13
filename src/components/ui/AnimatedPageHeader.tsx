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
                    <span className={isLast ? 'text-slate-300' : ''}>{label}</span>
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
          <span className="text-4xl">{icon}</span>
        )}
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-100">
            {title}
          </h1>
        </div>
      </div>

      {subtitle && (
        <p
          className={`mt-3 text-lg text-slate-300 max-w-3xl leading-relaxed ${
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
