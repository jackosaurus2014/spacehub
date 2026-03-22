'use client';

import { motion } from 'framer-motion';

const SNAPSHOT_METRICS = [
  {
    label: 'Global Space Economy',
    value: '$546B',
    trend: '+8.2%',
    trendUp: true,
    source: 'Space Foundation 2025',
    icon: '🌍',
    sparkline: [38, 42, 40, 45, 48, 52, 55, 58, 62, 65, 68, 72],
  },
  {
    label: 'Active Satellites',
    value: '10,500+',
    trend: '+12%',
    trendUp: true,
    source: 'UCS Satellite Database',
    icon: '🛰️',
    sparkline: [35, 38, 42, 48, 52, 58, 62, 68, 72, 78, 85, 92],
  },
  {
    label: 'Orbital Launches',
    value: '320+',
    trend: '+18%',
    trendUp: true,
    source: 'SpaceNexus Tracking',
    icon: '🚀',
    sparkline: [30, 35, 32, 40, 45, 50, 48, 55, 60, 65, 70, 75],
  },
  {
    label: 'VC Investment',
    value: '$8.1B',
    trend: '-22%',
    trendUp: false,
    source: 'Space Capital Q4 2024',
    icon: '💰',
    sparkline: [80, 75, 70, 65, 60, 55, 52, 48, 45, 42, 40, 38],
  },
  {
    label: 'Space Companies',
    value: '15,000+',
    trend: '+6%',
    trendUp: true,
    source: 'OECD Space Economy Report',
    icon: '🏢',
    sparkline: [45, 48, 50, 52, 55, 58, 60, 62, 64, 66, 68, 70],
  },
  {
    label: 'Space Workforce',
    value: '360K+',
    trend: '+4%',
    trendUp: true,
    source: 'Space Foundation',
    icon: '👷',
    sparkline: [50, 52, 53, 55, 56, 58, 59, 60, 62, 63, 64, 65],
  },
];

/** Mini sparkline chart using CSS bars */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[2px] h-8 mt-2">
      {data.map((val, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm transition-all ${
            positive ? 'bg-emerald-400/30' : 'bg-red-400/30'
          } ${i === data.length - 1 ? (positive ? 'bg-emerald-400/60' : 'bg-red-400/60') : ''}`}
          style={{ height: `${(val / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

export default function IndustrySnapshot() {
  return (
    <section className="py-16 md:py-24 relative z-10">
      <div className="container mx-auto px-4">
        {/* Terminal-style section header */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-400 to-blue-600" />
              <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
                Market Overview
              </h2>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-slate-600 font-medium">
              Updated Q1 2026
            </span>
          </div>
          <p className="text-sm text-slate-500 ml-4">Key space industry metrics at a glance</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {SNAPSHOT_METRICS.map((metric, i) => (
            <motion.div
              key={metric.label}
              className="card-glass p-4 group cursor-default"
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              viewport={{ once: true, amount: 0.3 }}
              custom={i}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold">{metric.label}</span>
                <span className="text-sm" role="img" aria-hidden="true">{metric.icon}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-white font-mono tabular-nums">{metric.value}</span>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${metric.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  {metric.trendUp ? '▲' : '▼'} {metric.trend}
                </span>
              </div>
              <Sparkline data={metric.sparkline} positive={metric.trendUp} />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] text-slate-600">{metric.source}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
