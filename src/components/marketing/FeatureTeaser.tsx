'use client';

import Link from 'next/link';
import { useSubscription } from '@/components/SubscriptionProvider';

interface FeatureTeaserProps {
  /** Feature name to display */
  featureName: string;
  /** Brief description of what the feature does */
  description: string;
  /** Which tier is required */
  requiredTier: 'pro' | 'enterprise';
  /** Number of free items to show before gating (e.g., "3 of 200+") */
  freePreviewCount?: number;
  /** Total items available */
  totalCount?: number;
  /** Children to render if user has access */
  children: React.ReactNode;
}

/**
 * Wraps content with a soft paywall. Shows a preview count and upgrade CTA
 * when free users view gated content. Pro/Enterprise users see content normally.
 *
 * Usage:
 * <FeatureTeaser featureName="Company Profiles" description="..." requiredTier="pro" freePreviewCount={3} totalCount={200}>
 *   <FullCompanyList />
 * </FeatureTeaser>
 */
export default function FeatureTeaser({
  featureName,
  description,
  requiredTier,
  freePreviewCount,
  totalCount,
  children,
}: FeatureTeaserProps) {
  const { tier } = useSubscription();

  // User has access — render children directly
  const tierOrder = { free: 0, pro: 1, enterprise: 2, test: 3 };
  if ((tierOrder[tier] ?? 0) >= (tierOrder[requiredTier] ?? 0)) {
    return <>{children}</>;
  }

  // Free user — show teaser
  const tierLabel = requiredTier === 'enterprise' ? 'Enterprise' : 'Pro';
  const price = requiredTier === 'enterprise' ? '$49.99' : '$19.99';

  return (
    <div>
      {/* Show the children (preview) */}
      {children}

      {/* Gradient fade overlay + upgrade CTA */}
      <div className="relative mt-0">
        {/* Gradient fade over bottom of content */}
        <div className="absolute -top-20 left-0 right-0 h-20 bg-gradient-to-t from-space-900 to-transparent pointer-events-none z-10" />

        {/* Upgrade card */}
        <div className="relative z-20 rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent p-5 text-center">
          {freePreviewCount && totalCount && (
            <p className="text-slate-400 text-xs mb-2">
              Showing {freePreviewCount} of {totalCount}+ {featureName.toLowerCase()}
            </p>
          )}
          <h4 className="text-white font-semibold text-sm mb-1">
            Unlock Full {featureName}
          </h4>
          <p className="text-slate-400 text-xs mb-4 max-w-sm mx-auto">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href={`/pricing?utm_source=feature_teaser&utm_content=${encodeURIComponent(featureName)}`}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg transition-all"
            >
              Upgrade to {tierLabel} — {price}/mo
            </Link>
            <Link
              href="/pricing"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
