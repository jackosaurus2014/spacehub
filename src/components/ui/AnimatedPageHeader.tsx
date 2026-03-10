'use client';

import { ReactNode, useRef, useEffect, useState } from 'react';

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

  const accentGradients: Record<string, string> = {
    cyan: 'from-cyan-400 to-blue-500',
    purple: 'from-purple-400 to-pink-500',
    emerald: 'from-emerald-400 to-teal-500',
    amber: 'from-amber-400 to-orange-500',
    red: 'from-red-400 to-rose-500',
  };

  const gradient = accentGradients[accentColor] || accentGradients.cyan;

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
        <p
          className={`text-sm text-slate-400 mb-2 tracking-wide uppercase ${
            visible ? `animate-reveal-up ${delayClass(breadcrumbDelay)}` : 'opacity-0'
          }`}
        >
          {breadcrumb}
        </p>
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
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-100">
            {title}
          </h1>
          <div className={`h-1 w-16 mt-2 rounded-full bg-gradient-to-r ${gradient}`} />
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
