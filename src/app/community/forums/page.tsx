'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ITARWarningBanner from '@/components/community/ITARWarningBanner';

interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  threadCount: number;
  latestThread: {
    id: string;
    title: string;
    authorName: string;
    createdAt: string;
  } | null;
}

const FALLBACK_CATEGORIES: ForumCategory[] = [
  {
    id: '1',
    slug: 'launch-tech',
    name: 'Launch Technology',
    description: 'Discuss propulsion systems, launch vehicles, reusability, and next-gen launch platforms.',
    icon: '🚀',
    threadCount: 24,
    latestThread: null,
  },
  {
    id: '2',
    slug: 'satellite-ops',
    name: 'Satellite Operations',
    description: 'Orbital mechanics, satellite design, constellation management, and ground systems.',
    icon: '🛰️',
    threadCount: 18,
    latestThread: null,
  },
  {
    id: '3',
    slug: 'space-policy',
    name: 'Space Policy & Regulation',
    description: 'Government policy, spectrum allocation, licensing, and international space law.',
    icon: '⚖️',
    threadCount: 12,
    latestThread: null,
  },
  {
    id: '4',
    slug: 'business-funding',
    name: 'Business & Funding',
    description: 'Space industry investment, startup funding, business models, and market analysis.',
    icon: '💰',
    threadCount: 31,
    latestThread: null,
  },
  {
    id: '5',
    slug: 'deep-space',
    name: 'Deep Space Exploration',
    description: 'Lunar missions, Mars colonization, asteroid mining, and interplanetary travel.',
    icon: '🌌',
    threadCount: 15,
    latestThread: null,
  },
  {
    id: '6',
    slug: 'careers',
    name: 'Careers & Education',
    description: 'Career advice, job opportunities, academic programs, and professional development.',
    icon: '🎓',
    threadCount: 22,
    latestThread: null,
  },
  {
    id: '7',
    slug: 'general',
    name: 'General Discussion',
    description: 'Open forum for space industry topics that don\'t fit neatly into other categories.',
    icon: '💬',
    threadCount: 38,
    latestThread: null,
  },
  {
    id: '8',
    slug: 'announcements',
    name: 'Announcements',
    description: 'Official SpaceNexus announcements, platform updates, and community news.',
    icon: '📢',
    threadCount: 8,
    latestThread: null,
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ForumsPage() {
  const [categories, setCategories] = useState<ForumCategory[]>(FALLBACK_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/community/forums');
        if (res.ok) {
          const data = await res.json();
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
          }
        }
      } catch {
        // Use fallback categories
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Discussion Forums"
          subtitle="Engage with the space community. Ask questions, share insights, and discuss the latest in aerospace."
          icon={<span>{"💬"}</span>}
          breadcrumb="Community"
        />

        <ITARWarningBanner />

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category, idx) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
              >
                <Link href={`/community/forums/${category.slug}`}>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.005 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="card p-5 h-full group cursor-pointer relative overflow-hidden hover:border-cyan-500/30"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:border-slate-600/50 transition-colors">
                        {category.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + thread count */}
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                            {category.name}
                          </h3>
                          <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                            {category.threadCount} threads
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                          {category.description}
                        </p>

                        {/* Latest thread */}
                        {category.latestThread && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-700/50">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="truncate">{category.latestThread.title}</span>
                            <span className="flex-shrink-0">{timeAgo(category.latestThread.createdAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
