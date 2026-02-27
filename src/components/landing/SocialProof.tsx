'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const TESTIMONIALS = [
  {
    quote: "SpaceNexus replaced three separate tools we were using for market intelligence. The satellite tracking alone saved our team hours every week.",
    name: "Dr. Sarah Chen",
    title: "VP of Strategy",
    company: "Orbital Dynamics Inc.",
    persona: "Executive",
  },
  {
    quote: "As an investor, having real-time launch data, company profiles, and market sizing all in one place is invaluable. The AI-powered thesis generator is a game changer.",
    name: "Marcus Rodriguez",
    title: "Managing Partner",
    company: "Cislunar Ventures",
    persona: "Investor",
  },
  {
    quote: "The regulatory compliance tracking and spectrum management tools help us stay ahead of filing deadlines. Nothing else covers space regulations this comprehensively.",
    name: "Jennifer Walsh",
    title: "General Counsel",
    company: "NewSpace Telecom",
    persona: "Legal",
  },
];

const STATS = [
  { value: 200, suffix: '+', label: 'Company Profiles', prefix: '' },
  { value: 30, suffix: '+', label: 'Analysis Modules', prefix: '' },
  { value: 50, suffix: '+', label: 'Data Sources', prefix: '' },
  { value: 0, suffix: '', label: 'Starting Price', prefix: '$' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.5 } }),
};

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
  return <span>{prefix}{count}{suffix}</span>;
}

export default function SocialProof() {
  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.4 });

  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Testimonials */}
        <div className="text-center mb-10">
          <h2 className="text-display-sm font-display font-bold text-white mb-3">Trusted by Space Industry Professionals</h2>
          <div className="gradient-line max-w-xs mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} className="card p-6" custom={i} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
              <p className="text-slate-300 italic leading-relaxed mb-4">
                <span className="text-cyan-400 text-2xl font-serif not-italic">&ldquo;</span>
                {t.quote}
                <span className="text-cyan-400 text-2xl font-serif not-italic">&rdquo;</span>
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.title}, {t.company}</p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {t.persona}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div ref={statsRef} className="card p-8 rounded-2xl" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }}>
          <h3 className="text-center text-lg font-semibold text-slate-400 mb-6 uppercase tracking-wider">By the Numbers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} inView={statsInView} />
                </p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
