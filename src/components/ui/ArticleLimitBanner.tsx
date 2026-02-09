'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubscription } from '@/components/SubscriptionProvider';
import PremiumGate from '@/components/PremiumGate';

interface ArticleLimitBannerProps {
  /** Number of articles the user has viewed today */
  articlesViewed: number;
  /** Maximum articles allowed per day for free tier */
  maxArticles?: number;
}

export default function ArticleLimitBanner({
  articlesViewed,
  maxArticles = 10,
}: ArticleLimitBannerProps) {
  const { tier, isTrialing } = useSubscription();

  // Don't show for paid users or users on active trials
  if (tier !== 'free' || isTrialing) {
    return null;
  }

  const remaining = Math.max(0, maxArticles - articlesViewed);
  const isAtLimit = remaining === 0;
  const isApproachingLimit = remaining <= 3 && remaining > 0;

  // Don't show if user hasn't reached the warning threshold
  if (!isApproachingLimit && !isAtLimit) {
    return null;
  }

  // At limit: show full PremiumGate overlay
  if (isAtLimit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="mb-8"
      >
        <PremiumGate
          requiredTier="pro"
          context="article-limit"
          showPreview={false}
        >
          {/* Children won't render since the user is free tier */}
          <div />
        </PremiumGate>
      </motion.div>
    );
  }

  // Approaching limit: show warning banner
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="mb-6"
      >
        <div className="card px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-amber-500/30 hover:border-amber-400/50">
          {/* Subtle amber glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

          <div className="relative flex items-center gap-3">
            {/* Animated counter */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <motion.span
                key={remaining}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-amber-300 font-bold text-lg"
              >
                {remaining}
              </motion.span>
            </div>

            <div>
              <p className="text-slate-200 text-sm font-medium">
                You have{' '}
                <span className="text-amber-300 font-semibold">
                  {remaining} article{remaining !== 1 ? 's' : ''}
                </span>{' '}
                remaining today
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                Upgrade to Pro for unlimited access to all space industry news
              </p>
            </div>
          </div>

          <Link
            href="/pricing"
            className="relative flex-shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Upgrade Now
          </Link>

          {/* Progress bar showing usage */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(articlesViewed / maxArticles) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-amber-500 to-red-500"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
