'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types';
import { useSubscription } from '@/components/SubscriptionProvider';
import { toast } from '@/lib/toast';
import PageHeader from '@/components/ui/PageHeader';

function TrialDaysLeft(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function PricingCard({
  plan,
  isYearly,
  currentTier,
  isTrialing,
  trialEndsAt,
  onStartTrial,
  onSubscribe,
  isStartingTrial,
  isCheckingOut,
  isLoggedIn,
  hasPaymentMethod,
}: {
  plan: typeof SUBSCRIPTION_PLANS[0];
  isYearly: boolean;
  currentTier: SubscriptionTier;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  onStartTrial: (tier: SubscriptionTier) => void;
  onSubscribe: (tier: SubscriptionTier, interval: 'month' | 'year') => void;
  isStartingTrial: boolean;
  isCheckingOut: boolean;
  isLoggedIn: boolean;
  hasPaymentMethod: boolean;
}) {
  const price = isYearly ? plan.priceYearly : plan.price;
  const period = isYearly ? '/year' : '/month';
  const isCurrentPlan = plan.id === currentTier;
  const savings = isYearly && plan.price > 0
    ? Math.round((1 - plan.priceYearly / (plan.price * 12)) * 100)
    : 0;

  const isTrialingThisPlan = isTrialing && plan.id === currentTier;
  const daysLeft = TrialDaysLeft(trialEndsAt);

  return (
    <div
      className={`card p-6 relative ${
        plan.highlighted
          ? 'border-nebula-500 glow-border'
          : 'border-slate-200'
      } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-nebula-500 text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      {isCurrentPlan && !isTrialing && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
            Current Plan
          </span>
        </div>
      )}

      {isTrialingThisPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-amber-400 text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
            Trial Active &mdash; {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-slate-900">
            ${price === 0 ? '0' : price}
          </span>
          {price > 0 && (
            <span className="text-slate-400">{period}</span>
          )}
        </div>
        {savings > 0 && (
          <p className="text-green-400 text-sm mt-1">Save {savings}% yearly</p>
        )}
        {plan.trialDays && plan.trialDays > 0 && (
          <p className="text-amber-400 text-xs mt-1">{plan.trialDays}-day free trial available</p>
        )}
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">&#10003;</span>
            <span className="text-slate-400 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan && !isTrialing ? (
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : isTrialingThisPlan ? (
        <div className="space-y-2">
          <button
            disabled
            className="w-full py-3 px-4 rounded-lg bg-amber-100 text-amber-700 cursor-not-allowed font-semibold"
          >
            Trial Active &mdash; {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </button>
          <button
            onClick={() => onSubscribe(plan.id, isYearly ? 'year' : 'month')}
            disabled={isCheckingOut}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              plan.highlighted
                ? 'bg-nebula-500 text-slate-900 hover:bg-nebula-600'
                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
            } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCheckingOut ? 'Redirecting...' : 'Subscribe Now'}
          </button>
        </div>
      ) : plan.id === 'free' ? (
        <Link
          href="/register"
          className="block w-full py-3 px-4 rounded-lg bg-slate-100 text-slate-900 text-center hover:bg-slate-200 transition-colors"
        >
          Get Started Free
        </Link>
      ) : isLoggedIn && plan.trialDays && !isTrialing ? (
        <div className="space-y-2">
          <button
            onClick={() => onStartTrial(plan.id)}
            disabled={isStartingTrial}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              plan.highlighted
                ? 'bg-nebula-500 text-slate-900 hover:bg-nebula-600'
                : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
            } ${isStartingTrial ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStartingTrial ? 'Starting Trial...' : `Start ${plan.trialDays}-Day Free Trial`}
          </button>
          <button
            onClick={() => onSubscribe(plan.id, isYearly ? 'year' : 'month')}
            disabled={isCheckingOut}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 ${
              isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isCheckingOut ? 'Redirecting...' : 'Or Subscribe Now'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (!isLoggedIn) {
              toast.info('Please sign in to subscribe.');
              return;
            }
            onSubscribe(plan.id, isYearly ? 'year' : 'month');
          }}
          disabled={isCheckingOut}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            plan.highlighted
              ? 'bg-nebula-500 text-slate-900 hover:bg-nebula-600'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCheckingOut ? 'Redirecting...' : 'Subscribe Now'}
        </button>
      )}
    </div>
  );
}

function PricingPageContent() {
  const { data: session } = useSession();
  const { tier, isTrialing, trialEndsAt, refreshSubscription } = useSubscription();
  const searchParams = useSearchParams();
  const [isYearly, setIsYearly] = useState(true);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

  // Show success/cancel messages based on URL params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated! Welcome aboard.');
      refreshSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled. No charges were made.');
    }
  }, [searchParams, refreshSubscription]);

  // Fetch payment method status
  useEffect(() => {
    async function checkPaymentMethod() {
      if (!session?.user) return;
      try {
        const res = await fetch('/api/subscription');
        const data = await res.json();
        setHasPaymentMethod(data.hasPaymentMethod || false);
      } catch {
        // Silently fail
      }
    }
    checkPaymentMethod();
  }, [session]);

  const handleStartTrial = async (planTier: SubscriptionTier) => {
    if (!session?.user) {
      toast.info('Please sign in to start a free trial.');
      return;
    }

    setIsStartingTrial(true);
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-trial', tier: planTier }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to start trial.');
        return;
      }

      toast.success(`Your 14-day ${planTier === 'pro' ? 'Professional' : 'Enterprise'} trial has started!`);
      refreshSubscription();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleSubscribe = async (planTier: SubscriptionTier, interval: 'month' | 'year') => {
    if (!session?.user) {
      toast.info('Please sign in to subscribe.');
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planTier, interval }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || data.error || 'Failed to start checkout.';
        toast.error(errorMsg);
        return;
      }

      // Redirect to Stripe Checkout
      const checkoutUrl = data.data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error('Failed to get checkout URL. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.message || data.error || 'Failed to open billing portal.';
        toast.error(errorMsg);
        return;
      }

      const portalUrl = data.data?.url;
      if (portalUrl) {
        window.location.href = portalUrl;
      } else {
        toast.error('Failed to get portal URL. Please try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const isPaidSubscriber = tier !== 'free' && !isTrialing && hasPaymentMethod;

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Choose Your Plan"
          subtitle="The first and only platform that brings together real-time space industry data, interactive tools, regulatory intelligence, and market analytics. Built for entrepreneurs, executives, mission planners, lawyers, and enthusiasts."
        />

        {/* Audience strip */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {['Entrepreneurs', 'Executives', 'Mission Planners', 'Lawyers', 'Investors', 'Enthusiasts'].map((audience) => (
            <span
              key={audience}
              className="px-3 py-1 rounded-full text-xs font-medium border border-cyan-400/30 text-cyan-300 bg-cyan-400/5"
            >
              {audience}
            </span>
          ))}
        </div>

        {/* Manage Subscription button for existing paid subscribers */}
        {isPaidSubscriber && (
          <div className="flex justify-center mb-8">
            <button
              onClick={handleManageSubscription}
              disabled={isOpeningPortal}
              className="px-6 py-3 rounded-lg bg-nebula-500 text-slate-900 font-semibold hover:bg-nebula-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOpeningPortal ? 'Opening Portal...' : 'Manage Subscription'}
            </button>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isYearly ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isYearly ? 'bg-nebula-500' : 'bg-slate-500'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                isYearly ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isYearly ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'}`}>
            Yearly
            <span className="ml-1 text-green-400 text-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Save up to 17%</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              currentTier={tier}
              isTrialing={isTrialing}
              trialEndsAt={trialEndsAt}
              onStartTrial={handleStartTrial}
              onSubscribe={handleSubscribe}
              isStartingTrial={isStartingTrial}
              isCheckingOut={isCheckingOut}
              isLoggedIn={!!session?.user}
              hasPaymentMethod={hasPaymentMethod}
            />
          ))}
        </div>

        {/* FAQ / Trust Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-400 text-sm">
                Yes! You can cancel your subscription at any time. You&apos;ll continue
                to have access until the end of your billing period.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-400 text-sm">
                We accept all major credit cards, PayPal, and Apple Pay through
                our secure payment processor, Stripe.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-400 text-sm">
                Yes! All paid plans include a 14-day free trial. Try any plan with
                full access before you subscribe &mdash; no credit card required.
              </p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-slate-900 mb-2">
                Do you offer team discounts?
              </h3>
              <p className="text-slate-400 text-sm">
                Yes! Contact us for Enterprise pricing with team collaboration
                features and volume discounts.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-slate-200 mb-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Have questions? We&apos;re here to help.
          </p>
          <Link
            href="mailto:support@spacenexus.com"
            className="text-nebula-300 hover:text-nebula-200 transition-colors"
          >
            Contact Support &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">Loading pricing...</div></div>}>
      <PricingPageContent />
    </Suspense>
  );
}
