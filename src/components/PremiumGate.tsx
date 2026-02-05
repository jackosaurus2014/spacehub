'use client';

import Link from 'next/link';
import { useSubscription } from './SubscriptionProvider';
import { SubscriptionTier, SUBSCRIPTION_PLANS } from '@/types';
import { getRequiredTierForModule } from '@/lib/subscription';

interface PremiumGateProps {
  moduleId?: string;
  requiredTier?: SubscriptionTier;
  children: React.ReactNode;
  showPreview?: boolean; // Show blurred preview of content
}

export default function PremiumGate({
  moduleId,
  requiredTier: propRequiredTier,
  children,
  showPreview = true,
}: PremiumGateProps) {
  const { tier, canAccess, isLoading } = useSubscription();

  // Determine required tier
  const requiredTier = propRequiredTier || (moduleId ? getRequiredTierForModule(moduleId) : null);

  // If no premium requirement, show children
  if (!requiredTier) {
    return <>{children}</>;
  }

  // If user has access, show children
  if (moduleId ? canAccess(moduleId) : true) {
    return <>{children}</>;
  }

  // Check access based on required tier
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
  const hasAccess = tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === requiredTier);

  return (
    <div className="relative">
      {/* Blurred preview */}
      {showPreview && (
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>
      )}

      {/* Upgrade overlay */}
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="card p-8 text-center max-w-md mx-auto bg-white/95 backdrop-blur-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-nebula-100 flex items-center justify-center">
            <span className="text-3xl">🚀</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Upgrade to {plan?.name || 'Premium'}
          </h3>
          <p className="text-slate-500 mb-6">
            This feature requires a {plan?.name || 'premium'} subscription.
            Unlock real-time data, advanced analytics, and more.
          </p>
          <div className="space-y-3">
            <Link
              href="/pricing"
              className="block w-full py-3 px-6 rounded-lg bg-nebula-500 text-white font-semibold hover:bg-nebula-600 transition-colors"
            >
              View Plans - Starting at ${plan?.price || 9.99}/mo
            </Link>
            <Link
              href="/pricing"
              className="block text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              Compare all features →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Badge component for premium features
export function PremiumBadge({ tier }: { tier: SubscriptionTier }) {
  if (tier === 'free') return null;

  const colors = {
    pro: 'bg-nebula-100 text-nebula-700 border-nebula-300',
    enterprise: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  };

  const labels = {
    pro: 'PRO',
    enterprise: 'ENTERPRISE',
  };

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${colors[tier]}`}>
      {labels[tier]}
    </span>
  );
}

// Inline upgrade prompt for smaller features
export function UpgradePrompt({
  feature,
  requiredTier = 'pro',
}: {
  feature: string;
  requiredTier?: SubscriptionTier;
}) {
  const { tier } = useSubscription();
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

  if (tierOrder.indexOf(tier) >= tierOrder.indexOf(requiredTier)) {
    return null;
  }

  return (
    <Link
      href="/pricing"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-nebula-100 border border-nebula-300 text-nebula-700 text-sm hover:bg-nebula-200 transition-colors"
    >
      <span>🔒</span>
      <span>Upgrade to unlock {feature}</span>
    </Link>
  );
}
