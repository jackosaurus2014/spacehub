'use client';

import { useState, useEffect, Suspense, Fragment } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types';
import { useSubscription } from '@/components/SubscriptionProvider';
import { toast } from '@/lib/toast';
import { extractApiError } from '@/lib/errors';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import StickyMobileCTA from '@/components/mobile/StickyMobileCTA';

const PRICING_FAQ = [
  { question: 'Can I cancel anytime?', answer: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.' },
  { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, PayPal, and Apple Pay through our secure payment processor, Stripe.' },
  { question: 'Is there a free trial?', answer: 'Yes! All paid plans include a 14-day free trial. Try any plan with full access before you subscribe — no credit card required.' },
  { question: 'Do you offer team discounts?', answer: 'Yes! Contact us for Enterprise pricing with team collaboration features and volume discounts.' },
];

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
      className={`card p-6 relative transition-all duration-300 ${
        plan.highlighted
          ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/15 scale-[1.02]'
          : 'border-slate-700/50 hover:border-slate-600/50'
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
        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-white">
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
          className="w-full py-3 px-4 rounded-lg bg-slate-600/50 text-slate-300 cursor-not-allowed border border-slate-500/30"
        >
          Current Plan
        </button>
      ) : isTrialingThisPlan ? (
        <div className="space-y-2">
          <button
            disabled
            className="w-full py-3 px-4 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-not-allowed font-semibold"
          >
            Trial Active &mdash; {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
          </button>
          <button
            onClick={() => onSubscribe(plan.id, isYearly ? 'year' : 'month')}
            disabled={isCheckingOut}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              plan.highlighted
                ? 'bg-nebula-500 text-slate-900 hover:bg-nebula-600'
                : 'bg-slate-600/50 text-slate-100 hover:bg-slate-500/50 border border-slate-500/30'
            } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCheckingOut ? 'Redirecting...' : 'Subscribe Now'}
          </button>
        </div>
      ) : plan.id === 'free' ? (
        <Link
          href="/register"
          className="block w-full py-3 px-4 rounded-lg bg-slate-600/50 text-slate-100 text-center hover:bg-slate-500/50 border border-slate-500/30 transition-colors"
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
                : 'bg-slate-600/50 text-slate-100 hover:bg-slate-500/50 border border-slate-500/30'
            } ${isStartingTrial ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStartingTrial ? 'Starting Trial...' : `Start ${plan.trialDays}-Day Free Trial`}
          </button>
          <button
            onClick={() => onSubscribe(plan.id, isYearly ? 'year' : 'month')}
            disabled={isCheckingOut}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-slate-600/50 text-slate-200 hover:bg-slate-500/50 border border-slate-500/30 ${
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
              : 'bg-slate-600/50 text-slate-100 hover:bg-slate-500/50 border border-slate-500/30'
          } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCheckingOut ? 'Redirecting...' : 'Subscribe Now'}
        </button>
      )}
    </div>
  );
}

/* ---------- Feature Comparison Table ---------- */

const FEATURE_CATEGORIES = [
  {
    name: 'Content & Data',
    features: [
      { label: 'Daily article limit', free: '25', pro: 'Unlimited', enterprise: 'Unlimited' },
      { label: 'Company directory', free: 'Basic', pro: 'Full intelligence', enterprise: 'Full + AI reports' },
      { label: 'Space Score access', free: 'Top 10', pro: 'Full rankings', enterprise: 'Full + custom scoring' },
      { label: 'News categories', free: 'All', pro: 'All', enterprise: 'All' },
      { label: 'Market intelligence', free: 'Limited', pro: 'Full', enterprise: 'Full + AI insights' },
    ],
  },
  {
    name: 'Tools & Calculators',
    features: [
      { label: 'Satellite tracker', free: true, pro: true, enterprise: true },
      { label: 'Orbital calculator', free: true, pro: true, enterprise: true },
      { label: 'Launch cost calculator', free: true, pro: true, enterprise: true },
      { label: 'Resource exchange', free: false, pro: true, enterprise: true },
      { label: 'Space insurance calc', free: false, pro: false, enterprise: true },
      { label: 'Constellation designer', free: true, pro: true, enterprise: true },
    ],
  },
  {
    name: 'Intelligence & Analytics',
    features: [
      { label: 'Deal flow database', free: false, pro: '113+ deals', enterprise: '113+ deals' },
      { label: 'Executive move tracker', free: false, pro: true, enterprise: true },
      { label: 'Supply chain intel', free: false, pro: true, enterprise: true },
      { label: 'Regulatory calendar', free: false, pro: '105+ deadlines', enterprise: 'Full suite' },
      { label: 'Patent intelligence', free: false, pro: false, enterprise: true },
      { label: 'Procurement (SAM.gov)', free: false, pro: false, enterprise: true },
    ],
  },
  {
    name: 'Export & Integration',
    features: [
      { label: 'Chart export (CSV/PNG)', free: false, pro: true, enterprise: true },
      { label: 'Full API access', free: false, pro: false, enterprise: true },
      { label: 'Webhook integrations', free: false, pro: false, enterprise: true },
      { label: 'Custom dashboards', free: false, pro: false, enterprise: true },
    ],
  },
  {
    name: 'Support',
    features: [
      { label: 'Community support', free: true, pro: true, enterprise: true },
      { label: 'Priority support', free: false, pro: true, enterprise: true },
      { label: 'Dedicated account manager', free: false, pro: false, enterprise: true },
      { label: 'Ad-free experience', free: false, pro: true, enterprise: true },
    ],
  },
];

function renderCellValue(value: boolean | string) {
  if (value === true) return <span className="text-green-400 font-medium">&#10003;</span>;
  if (value === false) return <span className="text-slate-600">&mdash;</span>;
  return <span className="text-slate-300 text-sm">{value}</span>;
}

function FeatureComparisonTable() {
  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-white text-center mb-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        Full Feature Comparison
      </h2>
      <p className="text-xs text-slate-500 text-center mb-3 md:hidden">
        Swipe left/right to compare all plans
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50 scroll-smooth">
        <table className="w-full min-w-[520px] text-left">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm">
            <tr className="border-b border-slate-700">
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-sm font-semibold text-slate-300 w-[40%]">Feature</th>
              <th className="py-3 px-2 sm:py-4 sm:px-4 text-center text-sm font-semibold text-slate-100 w-[20%]">
                <div>Explorer</div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">Free</div>
              </th>
              <th className="py-3 px-2 sm:py-4 sm:px-4 text-center text-sm font-semibold text-cyan-300 w-[20%] border-x border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center justify-center gap-1.5">
                  Professional
                  <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-medium">Popular</span>
                </div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">$19.99/mo</div>
              </th>
              <th className="py-3 px-2 sm:py-4 sm:px-4 text-center text-sm font-semibold text-slate-100 w-[20%]">
                <div>Enterprise</div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">$49.99/mo</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_CATEGORIES.map((category) => (
              <Fragment key={category.name}>
                {/* Category header */}
                <tr className="bg-slate-800/50">
                  <td colSpan={4} className="py-2.5 px-5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    {category.name}
                  </td>
                </tr>
                {/* Feature rows */}
                {category.features.map((feature) => (
                  <tr key={feature.label} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-5 text-sm text-slate-300">{feature.label}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-center">{renderCellValue(feature.free)}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-center border-x border-cyan-500/20 bg-cyan-500/[0.02]">{renderCellValue(feature.pro)}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-center">{renderCellValue(feature.enterprise)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Social Proof Section ---------- */

const TRUST_AUDIENCES = [
  { label: 'VCs & Investors', icon: '📊' },
  { label: 'Defense & Gov', icon: '🛡️' },
  { label: 'Engineers', icon: '🔧' },
  { label: 'Startups', icon: '🚀' },
];

const PRICING_TESTIMONIALS = [
  {
    quote: 'SpaceNexus replaced three analyst subscriptions and a Bloomberg terminal for our space practice.',
    name: 'Rachel Torres',
    title: 'Partner, Orbital Ventures Capital',
  },
  {
    quote: 'The free tier gave us everything we needed to validate our space startup idea. Upgrading to Pro was a no-brainer.',
    name: 'James Park',
    title: 'CEO, Aether Propulsion',
  },
];

function SocialProofSection() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Trust badges */}
      <div className="text-center mb-8">
        <p className="text-lg font-semibold text-white mb-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          Trusted by 2,800+ space professionals
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {TRUST_AUDIENCES.map((a) => (
            <div key={a.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
              <span className="text-base" role="img" aria-label={a.label}>{a.icon}</span>
              <span className="text-sm text-slate-300">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PRICING_TESTIMONIALS.map((t) => (
          <div key={t.name} className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <svg className="w-6 h-6 text-cyan-500/40 mb-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>
            <p className="text-slate-300 text-sm leading-relaxed mb-4 italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div>
              <p className="text-white text-sm font-semibold">{t.name}</p>
              <p className="text-slate-400 text-xs">{t.title}</p>
            </div>
          </div>
        ))}
      </div>
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
        toast.error(extractApiError(data, 'Failed to start trial.'));
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
      <FAQSchema items={PRICING_FAQ} />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader title="Choose Your Plan" subtitle="Unlock the full power of space intelligence" icon="💎" accentColor="purple" />

        {/* Audience strip */}
        <ScrollReveal>
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
        </ScrollReveal>

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
        <ScrollReveal delay={0.1}>
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-medium ${!isYearly ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-colors overflow-hidden ${
                isYearly ? 'bg-nebula-500' : 'bg-slate-500'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  isYearly ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isYearly ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'}`}>
              Annual
            </span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-semibold">
              Save up to 17%
            </span>
          </div>
        </ScrollReveal>

        {/* Pricing Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto" staggerDelay={0.15}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <StaggerItem key={plan.id}>
              <PricingCard
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
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Social Proof */}
        <ScrollReveal className="mt-16">
          <SocialProofSection />
        </ScrollReveal>

        {/* FAQ / Trust Section */}
        <ScrollReveal className="mt-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Frequently Asked Questions
            </h2>
          </div>
        </ScrollReveal>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left" staggerDelay={0.1}>
          <StaggerItem>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-400 text-sm">
                Yes! You can cancel your subscription at any time. You&apos;ll continue
                to have access until the end of your billing period.
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-400 text-sm">
                We accept all major credit cards, PayPal, and Apple Pay through
                our secure payment processor, Stripe.
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-400 text-sm">
                Yes! All paid plans include a 14-day free trial. Try any plan with
                full access before you subscribe &mdash; no credit card required.
              </p>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">
                Do you offer team discounts?
              </h3>
              <p className="text-slate-400 text-sm">
                Yes! Contact us for Enterprise pricing with team collaboration
                features and volume discounts.
              </p>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Feature Comparison Table */}
        <ScrollReveal className="mt-16">
          <FeatureComparisonTable />
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal className="mt-16">
          <div className="text-center">
            <p className="text-slate-200 mb-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Have questions? We&apos;re here to help.
            </p>
            <Link
              href="mailto:support@spacenexus.us"
              className="text-nebula-300 hover:text-nebula-200 transition-colors"
            >
              Contact Support &rarr;
            </Link>
          </div>
        </ScrollReveal>
      </div>

      <StickyMobileCTA
        label="Start Free Trial"
        href="/register"
        variant="primary"
      />
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
