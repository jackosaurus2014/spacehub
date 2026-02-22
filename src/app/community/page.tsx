'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface CommunityStats {
  totalMembers: number;
  activeThreads: number;
  messagesSent: number;
}

const SECTIONS = [
  {
    title: 'Professional Directory',
    description: 'Browse and search space industry professionals. Connect with engineers, executives, investors, and researchers across the space sector.',
    href: '/community/directory',
    icon: (
      <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    accent: 'from-cyan-500/20 to-blue-500/20',
    borderAccent: 'hover:border-cyan-500/30',
  },
  {
    title: 'Messages',
    description: 'Direct messaging with space professionals. Discuss opportunities, partnerships, and collaborate in private conversations.',
    href: '/messages',
    icon: (
      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    accent: 'from-purple-500/20 to-pink-500/20',
    borderAccent: 'hover:border-purple-500/30',
  },
  {
    title: 'Discussion Forums',
    description: 'Industry forums organized by topic. Share insights, ask questions, and engage with the space community on launch tech, policy, funding, and more.',
    href: '/community/forums',
    icon: (
      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    accent: 'from-emerald-500/20 to-teal-500/20',
    borderAccent: 'hover:border-emerald-500/30',
  },
];

export default function CommunityPage() {
  const [stats, setStats] = useState<CommunityStats>({
    totalMembers: 1247,
    activeThreads: 89,
    messagesSent: 5632,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/community/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Use fallback stats
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Community Hub"
          subtitle="Connect with space industry professionals, share knowledge, and collaborate on the next frontier."
          icon={<span>{"👥"}</span>}
        />

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          {[
            { label: 'Members', value: stats.totalMembers, icon: '👤' },
            { label: 'Active Threads', value: stats.activeThreads, icon: '💬' },
            { label: 'Messages Sent', value: stats.messagesSent, icon: '✉️' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="card px-4 py-3 text-center"
            >
              {loading ? (
                <div className="flex justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-white">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
                </>
              )}
            </div>
          ))}
        </motion.div>

        {/* Main sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {SECTIONS.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1, duration: 0.5 }}
            >
              <Link href={section.href}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`card p-6 h-full group cursor-pointer relative overflow-hidden ${section.borderAccent}`}
                >
                  {/* Gradient background on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className={`absolute inset-0 bg-gradient-to-br ${section.accent}`} />
                  </div>

                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4 group-hover:border-slate-600/50 transition-colors">
                      {section.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors mb-2">
                      {section.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {section.description}
                    </p>
                    <div className="mt-4 flex items-center text-sm text-cyan-400 font-medium">
                      Explore
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Your profile CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="card p-6 mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Set Up Your Profile</h3>
              <p className="text-sm text-slate-400">
                Create your professional profile to be discoverable in the directory and connect with others.
              </p>
            </div>
            <Link
              href="/community/profile"
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit Profile
            </Link>
          </div>
        </motion.div>

        {/* Activity feed placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Activity Feed</h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-medium">Coming Soon</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              A real-time feed of community activity — new members, popular threads, and trending discussions.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
