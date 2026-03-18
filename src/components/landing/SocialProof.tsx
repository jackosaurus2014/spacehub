'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState, useCallback } from 'react';

// Testimonials removed — only real, verified testimonials should be displayed here.
// When real user feedback is collected (via /contact "User Story" submissions),
// add them to this array with source attribution.
const TESTIMONIALS: { quote: string; name: string; title: string; company: string; persona: string; initials: string; gradient: string }[] = [];

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

  // Mobile swipe state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);

  // Track which card is visible via IntersectionObserver
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>('[data-index]');
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!isNaN(idx)) setActiveCard(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  const scrollToCard = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Testimonial Cards — only shown when real testimonials exist */}
        {TESTIMONIALS.length > 0 && (
          <>
            {/* Section Header */}
            <div className="text-center mb-14">
              <motion.h2
                className="text-display text-3xl md:text-4xl text-white mb-4"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                What Space Professionals Say
              </motion.h2>
            </div>

            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-7 md:overflow-visible md:snap-none mb-4 md:mb-16"
            >
              {TESTIMONIALS.map((t, i) => (
                <motion.div
                  key={t.name}
                  className="group relative snap-center min-w-[85vw] flex-shrink-0 md:min-w-0 md:flex-shrink md:snap-align-none"
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  data-index={i}
                >
                  <div className="relative card-glass p-7 h-full flex flex-col">
                    <div className="absolute top-4 right-5 text-6xl font-serif leading-none text-white/70/[0.07] select-none pointer-events-none">
                      &ldquo;
                    </div>
                    <StarRating />
                    <p className="text-white/70 leading-relaxed mb-6 flex-1 relative z-10">
                      <span className="text-white/70 text-xl font-serif">&ldquo;</span>
                      {t.quote}
                      <span className="text-white/70 text-xl font-serif">&rdquo;</span>
                    </p>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent mb-5" />
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
                        <span className="text-xs font-bold text-white">{t.initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                        <p className="text-xs text-slate-400 truncate">{t.title}{t.company ? `, ${t.company}` : ''}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Scroll indicator dots — mobile only */}
            <div className="flex justify-center gap-2 mb-12 md:hidden" aria-hidden="true">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    activeCard === i
                      ? 'bg-white w-6'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  onClick={() => scrollToCard(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

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
            {['Aerospace Firms', 'Government Agencies', 'Venture Capital', 'Defense', 'Startups', 'Universities'].map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-slate-400 hover:text-white/70 hover:border-white/[0.12] transition-all duration-200 ease-smooth"
              >
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Live Usage Counter */}
        <motion.div
          className="relative overflow-hidden card-glass p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-center text-lg font-bold text-white mb-6 relative z-10">
            The space intelligence platform
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center relative z-10">
            {[
              { stat: '200+', label: 'Companies Tracked' },
              { stat: '50+', label: 'Data Sources' },
              { stat: '30+', label: 'Intelligence Modules' },
            ].map((item) => (
              <div key={item.label} className="group/usage">
                <p className="text-2xl md:text-3xl font-bold text-white group-hover/usage:text-white/70 transition-colors duration-200">
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
          className="relative overflow-hidden card-glass p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5 }}
        >

          <h3 className="text-center text-sm font-semibold text-slate-500 mb-6 uppercase tracking-widest relative z-10">
            SpaceNexus by the Numbers
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center relative z-10">
            {STATS.map((s) => (
              <div key={s.label} className="group/stat">
                <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-300 to-blue-500 bg-clip-text text-transparent group-hover/stat:from-white group-hover/stat:to-blue-400 transition-all duration-300">
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
