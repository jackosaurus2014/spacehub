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
import { trackGA4Event } from '@/lib/analytics';

const PRICING_FAQ = [
  { question: 'What is SpaceNexus?', answer: 'SpaceNexus is a comprehensive space industry intelligence platform that provides real-time data on satellite tracking, launch schedules, space stocks, regulatory compliance, and 200+ company profiles across 30+ modules.' },
  { question: 'Is there a free plan?', answer: 'Yes! Our Explorer plan is completely free and includes access to mission countdowns, basic news feeds, satellite tracking for 50 satellites, and community features.' },
  { question: "What's included in the Professional plan?", answer: 'Professional ($19.99/month) unlocks unlimited news, full satellite tracking, market intelligence dashboards, launch window calculators, real-time stock tracking for 20 stocks, CSV data export, and an ad-free experience.' },
  { question: 'Can I cancel anytime?', answer: 'Absolutely. All plans are month-to-month with no long-term commitment. You can cancel anytime and retain access until the end of your billing period.' },
  { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards (Visa, Mastercard, American Express), Apple Pay, and Google Pay through our secure Stripe payment processor.' },
  { question: 'How does SpaceNexus compare to building this in-house?', answer: 'Companies typically spend $50K–$200K/year aggregating the same data from NASA, NOAA, SEC, SAM.gov, and 40+ other sources. SpaceNexus gives you all of it for under $50/month — with AI analysis included.' },
  { question: 'Do you offer team or enterprise pricing?', answer: 'Yes! Enterprise plans include team collaboration, custom dashboards, API access, SSO, and dedicated support. Contact us for a tailored quote.' },
  { question: 'What data sources does SpaceNexus use?', answer: 'We aggregate real-time data from NASA, NOAA, ESA, SpaceTrack, SEC filings, SAM.gov procurement, 53+ RSS feeds, and proprietary AI analysis — all automatically updated.' },
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
      className={`card p-6 relative transition-all duration-200 ${
        plan.highlighted
          ? 'border-white/[0.15] scale-[1.02]'
          : 'hover:border-white/[0.1]'
      } ${isCurrentPlan ? 'ring-1 ring-green-500/50' : ''}`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-white text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
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
          className="w-full py-3 px-4 rounded-lg bg-white/[0.06] text-slate-300 cursor-not-allowed border border-white/[0.06]"
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
                ? 'bg-white text-slate-900 hover:bg-white'
                : 'bg-white/[0.06] text-white hover:bg-white/[0.08] border border-white/[0.06]'
            } ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCheckingOut ? 'Redirecting...' : 'Subscribe Now'}
          </button>
        </div>
      ) : plan.id === 'free' ? (
        <Link
          href="/register"
          className="block w-full py-3 px-4 rounded-lg bg-white/[0.06] text-white text-center hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
        >
          Get Started Free
        </Link>
      ) : isLoggedIn && plan.trialDays && !isTrialing ? (
        <div className="space-y-2">
          <button
            onClick={() => onStartTrial(plan.id)}
            disabled={isStartingTrial}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              plan.highlighted
                ? 'bg-white text-slate-900 hover:bg-slate-100'
                : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
            } ${isStartingTrial ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isStartingTrial ? 'Starting Trial...' : `Start ${plan.trialDays}-Day Free Trial`}
          </button>
          <button
            onClick={() => onSubscribe(plan.id, isYearly ? 'year' : 'month')}
            disabled={isCheckingOut}
            className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-white/[0.06] text-white/90 hover:bg-white/[0.08] border border-white/[0.06] ${
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
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            plan.highlighted
              ? 'bg-white text-slate-900 hover:bg-slate-100'
              : 'bg-white/10 text-white hover:bg-white/15 border border-white/10'
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
      <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/50 scroll-smooth">
        <table className="w-full min-w-[520px] text-left">
          <thead className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm">
            <tr className="border-b border-white/[0.06]">
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-sm font-semibold text-slate-300 w-[40%]">Feature</th>
              <th className="py-3 px-2 sm:py-4 sm:px-4 text-center text-sm font-semibold text-white w-[20%]">
                <div>Explorer</div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">Free</div>
              </th>
              <th className="py-3 px-2 sm:py-4 sm:px-4 text-center text-sm font-semibold text-white/90 w-[20%] border-x border-white/10 bg-white/5">
                <div className="flex items-center justify-center gap-1.5">
                  Professional
                  <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded-full font-medium">Popular</span>
                </div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">$19.99/mo</div>
              </th>
              <th className="py-3 px-2 sm:py-4 sm:px-4 text-center text-sm font-semibold text-white w-[20%]">
                <div>Enterprise</div>
                <div className="text-xs font-normal text-slate-400 mt-0.5">$49.99/mo</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {FEATURE_CATEGORIES.map((category) => (
              <Fragment key={category.name}>
                {/* Category header */}
                <tr className="bg-white/[0.04]">
                  <td colSpan={4} className="py-2.5 px-5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {category.name}
                  </td>
                </tr>
                {/* Feature rows */}
                {category.features.map((feature) => (
                  <tr key={feature.label} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-5 text-sm text-slate-300">{feature.label}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-center">{renderCellValue(feature.free)}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-4 text-center border-x border-white/10 bg-white/[0.02]">{renderCellValue(feature.pro)}</td>
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
          Built for space professionals
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {TRUST_AUDIENCES.map((a) => (
            <div key={a.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06]">
              <span className="text-base" role="img" aria-label={a.label}>{a.icon}</span>
              <span className="text-sm text-slate-300">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PRICING_TESTIMONIALS.map((t) => (
          <div key={t.name} className="p-5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <svg className="w-6 h-6 text-slate-300/40 mb-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

/* ---------- FAQ Accordion Item ---------- */

function FAQAccordionItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm overflow-hidden transition-colors hover:border-white/[0.1]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
        aria-expanded={isOpen}
      >
        <h3 className="font-semibold text-white text-sm md:text-base">{question}</h3>
        <svg
          className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">
          {answer}
        </p>
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
    trackGA4Event('cta_click', { cta: 'start_free_trial', plan: planTier, location: 'pricing_page' });

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
    trackGA4Event('cta_click', { cta: 'subscribe', plan: planTier, interval, location: 'pricing_page' });

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

      {/* Product structured data for each pricing tier */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'SpaceNexus Explorer',
              description: 'Free tier of SpaceNexus space industry intelligence platform. Includes news feeds, satellite tracking, mission countdowns, and public data.',
              brand: { '@type': 'Brand', name: 'SpaceNexus' },
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: 'https://spacenexus.us/pricing',
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'SpaceNexus Professional',
              description: 'Professional tier with unlimited articles, deal flow database, executive move tracker, supply chain intelligence, full company profiles, and ad-free experience.',
              brand: { '@type': 'Brand', name: 'SpaceNexus' },
              offers: {
                '@type': 'Offer',
                price: '19.99',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: 'https://spacenexus.us/pricing',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '19.99',
                  priceCurrency: 'USD',
                  unitCode: 'MON',
                  billingDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
                },
              },
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: 'SpaceNexus Enterprise',
              description: 'Enterprise tier with AI-powered intelligence reports, API access, custom dashboards, webhook integrations, patent intelligence, procurement intelligence, and dedicated account manager.',
              brand: { '@type': 'Brand', name: 'SpaceNexus' },
              offers: {
                '@type': 'Offer',
                price: '49.99',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: 'https://spacenexus.us/pricing',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: '49.99',
                  priceCurrency: 'USD',
                  unitCode: 'MON',
                  billingDuration: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
                },
              },
            },
          ]).replace(/</g, '\\u003c'),
        }}
      />

      <div className="container mx-auto px-4">
        {/* Founding Member Promotional Banner */}
        <ScrollReveal>
          <div className="max-w-4xl mx-auto mt-8 mb-6">
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 shadow-lg shadow-purple-500/10">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-purple-800/90 to-blue-900/90" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />

              <div className="relative px-6 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-lg sm:text-xl font-bold text-white mb-1">
                    <span role="img" aria-label="rocket">🚀</span> Founding Member Offer
                  </p>
                  <p className="text-sm sm:text-base text-purple-100/90">
                    First 50 subscribers get <span className="font-bold text-white">Professional access at $4.99/month</span>, locked for life.
                    Only <span className="font-bold text-amber-300">12 spots</span> remaining.
                  </p>
                </div>
                <Link
                  href="/register?plan=pro&founding=true"
                  onClick={() => trackGA4Event('cta_click', { cta: 'founding_member', location: 'pricing_page' })}
                  className="shrink-0 px-6 py-3 rounded-xl bg-white text-indigo-900 font-bold text-sm sm:text-base hover:bg-purple-100 transition-colors shadow-md hover:shadow-lg"
                >
                  Claim Your Spot
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Social Proof Stats */}
        <ScrollReveal>
          <div className="max-w-4xl mx-auto mb-8 text-center">
            <p className="text-sm font-semibold text-white/80 mb-3">
              Trusted by space professionals worldwide
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-white font-bold">200+</span> company profiles
              </span>
              <span className="hidden sm:inline text-slate-600" aria-hidden="true">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-white font-bold">30+</span> data modules
              </span>
              <span className="hidden sm:inline text-slate-600" aria-hidden="true">|</span>
              <span className="flex items-center gap-1.5">
                <span className="text-white font-bold">10,000+</span> data points updated daily
              </span>
            </div>
          </div>
        </ScrollReveal>

        <AnimatedPageHeader title="Choose Your Plan" subtitle="Unlock the full power of space intelligence" icon="💎" accentColor="purple" />

        {/* Audience strip */}
        <ScrollReveal>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {['Entrepreneurs', 'Executives', 'Mission Planners', 'Lawyers', 'Investors', 'Enthusiasts'].map((audience) => (
              <span
                key={audience}
                className="px-3 py-1 rounded-full text-xs font-medium border border-white/10 text-white/90 bg-white/5"
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
              className="px-6 py-3 rounded-lg bg-white text-slate-900 font-semibold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                isYearly ? 'bg-white' : 'bg-slate-500'
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

        {/* ROI Value Prop */}
        <ScrollReveal className="mb-10">
          <div className="max-w-3xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <p className="text-sm text-emerald-400 font-semibold mb-1">
              Companies typically spend $50K&ndash;$200K/year on space industry data
            </p>
            <p className="text-slate-300 text-sm">
              SpaceNexus aggregates 50+ sources including NASA, NOAA, SEC, and SAM.gov &mdash; starting at <span className="font-bold text-white">$0/month</span>
            </p>
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

        {/* FAQ Accordion Section */}
        <ScrollReveal className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-sm">Everything you need to know about SpaceNexus</p>
          </div>
        </ScrollReveal>
        <div className="max-w-3xl mx-auto space-y-3">
          {PRICING_FAQ.map((faq, index) => (
            <ScrollReveal key={faq.question} delay={index * 0.05}>
              <FAQAccordionItem question={faq.question} answer={faq.answer} />
            </ScrollReveal>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <ScrollReveal className="mt-16">
          <FeatureComparisonTable />
        </ScrollReveal>

        {/* Trust Guarantees */}
        <ScrollReveal className="mt-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { icon: '🔒', title: 'Secure Payments', desc: 'Powered by Stripe with bank-level encryption' },
              { icon: '⚡', title: 'Instant Access', desc: 'Start exploring modules immediately after signup' },
              { icon: '🛡️', title: '14-Day Free Trial', desc: 'Full access, no credit card required, cancel anytime' },
            ].map((item) => (
              <div key={item.title} className="text-center p-4">
                <span className="text-2xl mb-2 block">{item.icon}</span>
                <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal className="mt-12">
          <div className="text-center">
            <p className="text-white/90 mb-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Have questions? We&apos;re here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/book-demo"
                className="btn-primary px-8 py-3"
              >
                Book a Demo
              </Link>
              <Link
                href="mailto:support@spacenexus.us"
                className="text-white/90 hover:text-white transition-colors"
              >
                Contact Support &rarr;
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Competitor Comparison Links */}
      <div className="container mx-auto px-4 pb-12">
        <ScrollReveal>
          <div className="text-center">
            <p className="text-slate-500 text-sm mb-3">See how SpaceNexus compares</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/compare/payload-space" className="text-sm text-slate-400 hover:text-white transition-colors link-underline">
                vs. Payload Space
              </Link>
              <span className="text-slate-700">&bull;</span>
              <Link href="/compare/quilty-analytics" className="text-sm text-slate-400 hover:text-white transition-colors link-underline">
                vs. Quilty Analytics
              </Link>
              <span className="text-slate-700">&bull;</span>
              <Link href="/compare/bloomberg-terminal" className="text-sm text-slate-400 hover:text-white transition-colors link-underline">
                vs. Bloomberg Terminal
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <StickyMobileCTA
        label="Start Free Trial"
        href="/register?trial=true&plan=pro"
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
