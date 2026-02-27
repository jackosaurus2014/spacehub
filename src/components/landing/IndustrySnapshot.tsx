'use client';

import { motion } from 'framer-motion';

const SNAPSHOT_METRICS = [
  {
    label: 'Global Space Economy',
    value: '$546B',
    trend: '+8.2%',
    trendUp: true,
    source: 'Space Foundation 2024',
    icon: '\u{1F30D}',
  },
  {
    label: 'Active Satellites',
    value: '10,500+',
    trend: '+12%',
    trendUp: true,
    source: 'UCS Satellite Database',
    icon: '\u{1F6F0}\uFE0F',
  },
  {
    label: 'Launches in 2025',
    value: '230+',
    trend: '+15%',
    trendUp: true,
    source: 'SpaceNexus Tracking',
    icon: '\u{1F680}',
  },
  {
    label: 'VC Investment',
    value: '$8.1B',
    trend: '-22%',
    trendUp: false,
    source: 'Space Capital Q4 2024',
    icon: '\u{1F4B0}',
  },
  {
    label: 'Space Companies',
    value: '15,000+',
    trend: '+6%',
    trendUp: true,
    source: 'OECD Space Economy Report',
    icon: '\u{1F3E2}',
  },
  {
    label: 'Space Workforce',
    value: '360K+',
    trend: '+4%',
    trendUp: true,
    source: 'Space Foundation',
    icon: '\u{1F477}',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export default function IndustrySnapshot() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-display-sm font-display font-bold text-white mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Space Industry at a Glance
          </h2>
          <p className="text-slate-400 text-lg">Key metrics updated quarterly</p>
          <div className="gradient-line max-w-xs mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {SNAPSHOT_METRICS.map((metric, i) => (
            <motion.div
              key={metric.label}
              className="card p-4 rounded-2xl border border-slate-700/50 hover:border-cyan-500/30 transition-colors"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              custom={i}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl" role="img" aria-hidden="true">{metric.icon}</span>
                <span className="text-sm text-slate-300 font-medium">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-2xl font-bold text-white">{metric.value}</span>
                <span className={`text-sm font-semibold flex items-center gap-0.5 ${metric.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {metric.trendUp ? '\u25B2' : '\u25BC'} {metric.trend}
                </span>
              </div>
              <span className="text-xs text-slate-500">{metric.source}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
