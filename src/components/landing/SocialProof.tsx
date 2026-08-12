'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { SITE_STATS } from '@/lib/site-stats';

/**
 * Parse a SITE_STATS display string (e.g. '6,000+', '120+', '26') into an
 * animatable numeric value plus prefix/suffix — same convention as KPIStrip,
 * so every number on this band traces back to the single source of truth.
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

interface ReachStat {
  label: string;
  href: string;
  value: number;
  prefix: string;
  suffix: string;
}

// Honest platform-reach numbers — every value traces back to SITE_STATS, the
// single source of truth for platform statistics. No fabricated quotes or
// user counts. See src/lib/site-stats.ts for how each figure is audited.
const STATS: ReachStat[] = [
  { label: 'Job Listings', href: '/space-talent', ...parseStat(SITE_STATS.jobListings) },
  { label: 'Company Profiles', href: '/company-profiles', ...parseStat(SITE_STATS.companies) },
  { label: 'Original Articles', href: '/blog', ...parseStat(SITE_STATS.articles) },
  { label: 'News Feeds Tracked', href: '/news', ...parseStat(SITE_STATS.newsFeeds) },
];

function AnimatedCounter({ value, prefix, suffix, inView }: { value: number; prefix: string; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (value === 0) { setCount(0); return; }
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);
  return <span>{prefix}{count.toLocaleString('en-US')}{suffix}</span>;
}

export default function SocialProof() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 });

  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Industry Logos / Trust Badges */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-5">
            Built for professionals across
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Aerospace Firms', 'Government Agencies', 'Venture Capital', 'Recruiting Teams', 'Defense', 'Startups', 'Universities'].map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-slate-400 hover:text-white/70 hover:border-white/[0.12] transition-all duration-200 ease-smooth"
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Platform Reach — honest, live numbers. No testimonials until we have real, verified quotes. */}
        <motion.div
          ref={statsRef}
          className="relative overflow-hidden card-glass p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-center text-sm font-semibold text-slate-500 mb-1 uppercase tracking-widest relative z-10">
            SpaceNexus Platform Reach
          </h3>
          <p className="text-center text-xs text-slate-600 mb-6 relative z-10">
            Real data, refreshed daily — not marketing estimates
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center relative z-10">
            {STATS.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                aria-label={`${s.label}: ${s.prefix}${s.value.toLocaleString('en-US')}${s.suffix}. View details.`}
                className="group/stat block rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              >
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent group-hover/stat:from-white group-hover/stat:to-cyan-400 transition-all duration-300">
                  <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} inView={statsInView} />
                </p>
                <p className="text-sm text-slate-400 mt-1.5 font-medium">{s.label}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
