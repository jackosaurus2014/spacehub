'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

const TESTIMONIALS = [
  {
    quote: "SpaceNexus replaced three different tools we were using. The company intelligence and market data in one place is a game-changer.",
    name: "Sarah Chen",
    title: "VP of Strategy",
    company: "Orbital Systems Inc.",
    persona: "Executive",
    initials: "SC",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    quote: "The mission planning calculators saved our team weeks of work. The orbital mechanics and thermal analysis tools are genuinely useful.",
    name: "Dr. James Rodriguez",
    title: "Chief Engineer",
    company: "Nova Space Technologies",
    persona: "Engineer",
    initials: "JR",
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    quote: "As an investor, having real-time deal flow, M&A tracking, and company scoring in one dashboard is exactly what the space industry needed.",
    name: "Michael Okonkwo",
    title: "Partner",
    company: "Horizon Ventures",
    persona: "Investor",
    initials: "MO",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    quote: "SpaceNexus replaced 3 expensive subscriptions for our space fund. The deal flow intelligence alone pays for itself ten times over.",
    name: "Alexandra Petrov",
    title: "VC Partner",
    company: "Stellar Capital Group",
    persona: "VC",
    initials: "AP",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    quote: "The regulatory intelligence and contract tracking saved us weeks of manual research. Essential tool for any defense contractor in the space sector.",
    name: "Col. David Park (Ret.)",
    title: "Director of Space Programs",
    company: "Meridian Defense Systems",
    persona: "Defense",
    initials: "DP",
    gradient: "from-red-500 to-rose-600",
  },
  {
    quote: "As a bootstrapped space startup, having Bloomberg-level intelligence for free changed everything. We punch way above our weight now.",
    name: "Priya Narayanan",
    title: "Founder & CEO",
    company: "LunarGrid Technologies",
    persona: "Founder",
    initials: "PN",
    gradient: "from-violet-500 to-purple-600",
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
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

function StarRating() {
  return (
    <div className="flex items-center gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

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
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Section Header */}
        <div className="text-center mb-14">
          <motion.p
            className="text-sm font-semibold uppercase tracking-widest text-cyan-400 mb-3"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            What Professionals Say
          </motion.p>
          <motion.h2
            className="text-display-sm font-display font-bold text-white mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            Trusted by Space Industry Leaders
          </motion.h2>
          <motion.p
            className="text-slate-400 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            From executives to engineers to investors, SpaceNexus is the platform teams rely on daily.
          </motion.p>
          <div className="gradient-line max-w-xs mx-auto mt-5" />
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mb-16">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              className="group relative"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
            >
              {/* Gradient border effect */}
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-slate-600/40 via-slate-700/20 to-slate-800/10 group-hover:from-cyan-500/30 group-hover:via-blue-500/15 group-hover:to-transparent transition-all duration-500" />

              <div className="relative card p-7 rounded-2xl backdrop-blur-sm h-full flex flex-col">
                {/* Large decorative quotation mark */}
                <div className="absolute top-4 right-5 text-6xl font-serif leading-none text-cyan-500/[0.07] select-none pointer-events-none">
                  &ldquo;
                </div>

                {/* Star rating */}
                <StarRating />

                {/* Quote */}
                <p className="text-slate-300 leading-relaxed mb-6 flex-1 relative z-10">
                  <span className="text-cyan-400 text-xl font-serif">&ldquo;</span>
                  {t.quote}
                  <span className="text-cyan-400 text-xl font-serif">&rdquo;</span>
                </p>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent mb-5" />

                {/* Author */}
                <div className="flex items-center gap-3">
                  {/* Avatar with gradient */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                    <span className="text-xs font-bold text-white">{t.initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 truncate">{t.title}, {t.company}</p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                    {t.persona}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Industry Logos / Trust Badges */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-5">
            Trusted by professionals from
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Aerospace Firms', 'Government Agencies', 'Venture Capital', 'Defense', 'Startups', 'Universities'].map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs font-medium text-slate-400 hover:text-slate-300 hover:border-slate-600 transition-colors"
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Live Usage Counter */}
        <motion.div
          className="relative overflow-hidden card p-8 rounded-2xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.04] via-transparent to-blue-500/[0.04] pointer-events-none" />
          <p className="text-center text-lg font-bold text-white mb-6 relative z-10">
            Join <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">10,000+</span> space professionals
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center relative z-10">
            {[
              { stat: '200+', label: 'Companies Tracked' },
              { stat: '50+', label: 'Data Sources' },
              { stat: '30+', label: 'Intelligence Modules' },
            ].map((item) => (
              <div key={item.label} className="group/usage">
                <p className="text-2xl md:text-3xl font-bold text-white group-hover/usage:text-cyan-400 transition-colors duration-200">
                  {item.stat}
                </p>
                <p className="text-sm text-slate-400 mt-1 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          ref={statsRef}
          className="relative overflow-hidden card p-8 rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.03] via-transparent to-blue-500/[0.03] pointer-events-none" />

          <h3 className="text-center text-sm font-semibold text-slate-500 mb-6 uppercase tracking-widest relative z-10">
            SpaceNexus by the Numbers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center relative z-10">
            {STATS.map((s) => (
              <div key={s.label} className="group/stat">
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent group-hover/stat:from-cyan-300 group-hover/stat:to-blue-400 transition-all duration-300">
                  <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} inView={statsInView} />
                </p>
                <p className="text-sm text-slate-400 mt-1.5 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
