'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="/SpaceNexus%20background.jpg"
        >
          <source src="/Space_Station_Docking_and_Solar_Array.mp4" type="video/mp4" />
        </video>
        {/* Dark gradient overlay on video */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a15]/80 via-[#050a15]/60 to-[#050a15]/95" />
      </div>

      {/* Decorative atmospheric glow orbs */}
      <div className="absolute top-1/4 -left-48 w-[500px] h-[500px] bg-nebula-500/20 rounded-full blur-[160px] pointer-events-none z-[1]" />
      <div className="absolute bottom-1/4 -right-48 w-[400px] h-[400px] bg-plasma-500/15 rounded-full blur-[160px] pointer-events-none z-[1]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[200px] pointer-events-none z-[1]" />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mb-8"
          >
            <Image
              src="/spacenexus-logo.png"
              alt="SpaceNexus logo"
              width={800}
              height={400}
              className="w-full max-w-2xl mx-auto h-auto rounded-lg opacity-95"
              priority
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="text-3xl md:text-5xl lg:text-display-xl font-display font-bold mb-6 leading-tight"
          >
            <span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              The Space Industry&apos;s First
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300">
              Comprehensive Intelligence Platform
            </span>
          </motion.h1>

          {/* Subtitle — condensed value proposition */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
            className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
          >
            Real-time data, interactive tools, regulatory intelligence, and market
            analytics &mdash; all in one affordable platform for space industry
            professionals.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
          >
            <Link
              href="/mission-control"
              className="btn-primary text-base py-4 px-10 shadow-lg shadow-nebula-500/30 inline-flex items-center justify-center"
            >
              Explore the Platform
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-cyan-400 text-base py-4 px-10 rounded-full font-bold uppercase tracking-wide transition-all duration-300 hover:-translate-y-0.5 active:scale-95 bg-[#0a1628] text-[#e0f7ff] hover:bg-cyan-500 hover:text-white hover:border-cyan-500"
              style={{ textShadow: '0 0 8px rgba(34,211,238,0.4)' }}
            >
              Start Free Trial
            </Link>
          </motion.div>

          {/* Secondary links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex gap-6 justify-center"
          >
            <Link
              href="/register"
              className="text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              Create Free Account
            </Link>
            <span className="text-cyan-400/50">|</span>
            <Link
              href="/news"
              className="text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              Browse News
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"
      >
        <div className="w-6 h-10 border-2 border-cyan-400/50 rounded-full flex items-start justify-center p-1.5 shadow-lg shadow-cyan-500/20">
          <div className="w-1.5 h-2.5 bg-cyan-400/70 rounded-full animate-pulse" />
        </div>
      </motion.div>

      {/* Bottom gradient divider */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050a15] to-transparent z-[2]" />
    </section>
  );
}
