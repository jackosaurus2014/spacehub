'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const STEPS = [
  {
    step: 1,
    title: 'Create Your Free Account',
    description: 'Sign up in seconds. No credit card required. Instant access to 30+ space industry modules.',
    art: '/art/onboarding-step1.png',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 8.41m5.96 5.96a14.93 14.93 0 01-5.96 2.58m0 0a14.9 14.9 0 01-8.63-2.58m8.63 2.58v4.8m-8.63-7.38a6 6 0 015.84-7.38" />
      </svg>
    ),
  },
  {
    step: 2,
    title: 'Customize Your Dashboard',
    description: 'Choose your role -- Investor, Entrepreneur, Mission Planner, or Executive -- and get a personalized workspace.',
    art: '/art/onboarding-step2.png',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    step: 3,
    title: 'Get Real-Time Intelligence',
    description: 'Track satellites, monitor launches, analyze markets, and discover opportunities with live data from NASA, NOAA, and 40+ sources.',
    art: '/art/onboarding-step3.png',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
];

const container = { hidden: {}, visible: { transition: { staggerChildren: 0.25 } } };
const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function HowItWorks() {
  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-display text-3xl md:text-4xl text-white mb-3">How It Works</h2>
          <p className="text-slate-400 text-lg">From sign-up to insight in under a minute</p>
        </div>

        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {/* Connecting gradient lines (desktop only) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-gradient-to-r from-white/40 via-blue-500/30 to-slate-200/40 rounded-full" />

          {STEPS.map((s) => (
            <motion.div
              key={s.step}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group flex flex-col items-center text-center cursor-default"
            >
              <div className="relative z-10 w-20 h-20 rounded-full bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] flex items-center justify-center mb-5 group-hover:border-white/15 transition-all duration-200 ease-smooth">
                <span className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-black border border-white/[0.12] text-xs font-bold text-white/70 flex items-center justify-center">
                  {s.step}
                </span>
                <span className="text-white/70 group-hover:text-white transition-colors duration-200">{s.icon}</span>
              </div>
              <Image
                src={s.art}
                alt=""
                width={80}
                height={80}
                className="opacity-60 rounded-lg mb-3"
              />
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-white transition-colors duration-200">{s.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">{s.description}</p>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-12">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-medium text-sm py-3 px-8 rounded-lg transition-all duration-200 ease-smooth hover:bg-slate-100 hover:shadow-lg hover:shadow-white/[0.05] active:scale-[0.98]"
          >
            Get Started in 60 Seconds
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
