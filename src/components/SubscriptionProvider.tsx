'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
  isTrialing: boolean;
  trialEndsAt: Date | null;
  refreshSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  isLoading: true,
  canAccess: () => true,
  canUseFeature: () => false,
  isPro: false,
  isEnterprise: false,
  remainingArticles: 10,
  isTrialing: false,
  trialEndsAt: null,
  refreshSubscription: () => {},
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
  const [isTrialing, setIsTrialing] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (status === 'loading') return;

    if (!session?.user) {
      setTier('free');
      setRemainingArticles(10);
      setIsTrialing(false);
      setTrialEndsAt(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();

      setTier(data.tier || 'free');
      setIsTrialing(data.isTrialing || false);
      setTrialEndsAt(data.trialEndsAt ? new Date(data.trialEndsAt) : null);
      setRemainingArticles(
        data.tier === 'free' && !data.isTrialing
          ? Math.max(0, 10 - (data.dailyArticleViews || 0))
          : null
      );
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      setTier('free');
      setIsTrialing(false);
      setTrialEndsAt(null);
    } finally {
      setIsLoading(false);
    }
  }, [session, status]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const canAccess = (moduleId: string) => canAccessModule(tier, moduleId);
  const canUseFeature = (feature: keyof typeof TIER_ACCESS['free']) =>
    canAccessFeature(tier, feature);

  const value: SubscriptionContextType = {
    tier,
    isLoading,
    canAccess,
    canUseFeature,
    isPro: tier === 'pro' || tier === 'enterprise' || tier === 'test',
    isEnterprise: tier === 'enterprise' || tier === 'test',
    remainingArticles: tier === 'free' && !isTrialing ? remainingArticles : null,
    isTrialing,
    trialEndsAt,
    refreshSubscription: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
