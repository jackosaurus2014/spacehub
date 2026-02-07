'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types';
import { useSubscription } from '@/components/SubscriptionProvider';
import PageHeader from '@/components/ui/PageHeader';

function PricingCard({
  plan,
  isYearly,
  currentTier,
}: {
  plan: typeof SUBSCRIPTION_PLANS[0];
  isYearly: boolean;
  currentTier: SubscriptionTier;
}) {
  const price = isYearly ? plan.priceYearly : plan.price;
  const period = isYearly ? '/year' : '/month';
  const isCurrentPlan = plan.id === currentTier;
  const savings = isYearly && plan.price > 0
    ? Math.round((1 - plan.priceYearly / (plan.price * 12)) * 100)
    : 0;

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

      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className="bg-green-500 text-slate-900 text-xs font-semibold px-3 py-1 rounded-full">
            Current Plan
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
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">✓</span>
            <span className="text-slate-400 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrentPlan ? (
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
        >
          Current Plan
        </button>
      ) : plan.id === 'free' ? (
        <Link
          href="/register"
          className="block w-full py-3 px-4 rounded-lg bg-slate-100 text-slate-900 text-center hover:bg-slate-200 transition-colors"
        >
          Get Started Free
        </Link>
      ) : (
        <button
          onClick={() => {
            // TODO: Integrate with Stripe
            alert('Payment integration coming soon! For now, contact us for enterprise access.');
          }}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            plan.highlighted
              ? 'bg-nebula-500 text-slate-900 hover:bg-nebula-600'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }`}
        >
          {plan.id === 'enterprise' ? 'Contact Sales' : 'Subscribe Now'}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  const { data: session } = useSession();
  const { tier } = useSubscription();
  const [isYearly, setIsYearly] = useState(true);

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Choose Your Plan"
          subtitle="Get unlimited access to space industry intelligence, real-time stock tracking, and AI-powered business opportunities."
        />

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
                Our Enthusiast plan is free forever with access to core features.
                Upgrade anytime to unlock premium features.
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
            Contact Support →
          </Link>
        </div>
      </div>
    </div>
  );
}
