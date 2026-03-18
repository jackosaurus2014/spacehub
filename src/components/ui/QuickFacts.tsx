'use client';

import { useState, useEffect, useRef } from 'react';

export interface QuickFact {
  value: string;
  label: string;
}

interface QuickFactsProps {
  facts: QuickFact[];
  title?: string;
}

function AnimatedValue({ value }: { value: string }) {
  // Try to parse leading number for animation
  const match = value.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(value);
  const animated = useRef(false);

  useEffect(() => {
    if (!match || animated.current || !ref.current) {
      setDisplayed(value);
      return;
    }

    const prefix = match[1];
    const numStr = match[2];
    const suffix = match[3];
    const target = parseFloat(numStr.replace(/,/g, ''));
    if (isNaN(target)) {
      setDisplayed(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();
          const duration = 900;
          const hasDecimals = numStr.includes('.');
          const decimalPlaces = hasDecimals ? (numStr.split('.')[1]?.length || 1) : 0;
          const hasCommas = numStr.includes(',');

          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            let formatted: string;

            if (hasDecimals) {
              formatted = current.toFixed(decimalPlaces);
            } else {
              formatted = Math.round(current).toString();
            }

            if (hasCommas) {
              formatted = Number(formatted).toLocaleString('en-US', {
                minimumFractionDigits: decimalPlaces,
                maximumFractionDigits: decimalPlaces,
              });
            }

            setDisplayed(`${prefix}${formatted}${suffix}`);
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, match]);

  return <span ref={ref}>{displayed}</span>;
}

export default function QuickFacts({ facts, title = 'Quick Facts' }: QuickFactsProps) {
  return (
    <div className="card p-5 mb-8">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {facts.map((fact, i) => (
          <div key={i} className="text-center">
            <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-200 to-blue-400 bg-clip-text text-transparent">
              <AnimatedValue value={fact.value} />
            </div>
            <div className="text-slate-500 text-xs mt-0.5">{fact.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
