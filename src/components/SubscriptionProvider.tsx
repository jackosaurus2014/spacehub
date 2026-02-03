'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { SubscriptionTier } from '@/types';
import { canAccessModule, canAccessFeature, TIER_ACCESS } from '@/lib/subscription';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isLoading: boolean;
  canAccess: (moduleId: string) => boolean;
  canUseFeature: (feature: keyof typeof TIER_ACCESS['free']) => boolean;
  isPro: boolean;
  isEnterprise: boolean;
  remainingArticles: number | null; // null = unlimited
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  isLoading: true,
  canAccess: () => true,
  canUseFeature: () => false,
  isPro: false,
  isEnterprise: false,
  remainingArticles: 10,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export default function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { data: session, status } = useSession();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [remainingArticles, setRemainingArticles] = useState<number | null>(10);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (status === 'loading') return;

      if (!session?.user) {
        setTier('free');
        setRemainingArticles(10);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/subscription');
        const data = await res.json();

        setTier(data.tier || 'free');
        setRemainingArticles(
          data.tier === 'free'
            ? Math.max(0, 10 - (data.dailyArticleViews || 0))
            : null
        );
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        setTier('free');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [session, status]);

  const canAccess = (moduleId: string) => canAccessModule(tier, moduleId);
  const canUseFeature = (feature: keyof typeof TIER_ACCESS['free']) =>
    canAccessFeature(tier, feature);

  const value: SubscriptionContextType = {
    tier,
    isLoading,
    canAccess,
    canUseFeature,
    isPro: tier === 'pro' || tier === 'enterprise',
    isEnterprise: tier === 'enterprise',
    remainingArticles: tier === 'free' ? remainingArticles : null,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
