'use client';

import Link from 'next/link';
import { SubscriptionTier } from '@/types';

const TIER_CONFIG = {
  free: { label: 'Observer', clearance: 'CLEARANCE LEVEL 1', accent: 'zinc' },
  pro: { label: 'Operator', clearance: 'CLEARANCE LEVEL 2', accent: 'indigo' },
  enterprise: { label: 'Commander', clearance: 'CLEARANCE LEVEL 3', accent: 'amber' },
};

interface PricingCardV3Props {
  planId: string;
  planName: string;
  price: number;
  period: string;
  features: string[];
  highlighted?: boolean;
  savings?: number;
  trialDays?: number;
  isCurrentPlan: boolean;
  isTrialing: boolean;
  daysLeft: number;
  isLoggedIn: boolean;
  isStartingTrial: boolean;
  isCheckingOut: boolean;
  onStartTrial: (tier: SubscriptionTier) => void;
  onSubscribe: (tier: SubscriptionTier, interval: 'month' | 'year') => void;
  isYearly: boolean;
}

export default function PricingCardV3({
  planId,
  planName,
  price,
  period,
  features,
  highlighted,
  savings,
  trialDays,
  isCurrentPlan,
  isTrialing,
  daysLeft,
  isLoggedIn,
  isStartingTrial,
  isCheckingOut,
  onStartTrial,
  onSubscribe,
  isYearly,
}: PricingCardV3Props) {
  const tier = TIER_CONFIG[planId as keyof typeof TIER_CONFIG] || TIER_CONFIG.free;
  const isTrialingThis = isTrialing && isCurrentPlan;

  return (
    <div
      className={`relative overflow-hidden rounded-lg transition-all duration-150 ${
        highlighted ? 'card-terminal' : ''
      } ${isCurrentPlan && !isTrialing ? 'ring-1 ring-emerald-500' : ''}`}
      style={highlighted ? undefined : { background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Terminal chrome for highlighted plan */}
      {highlighted && (
        <div className="card-terminal__header">
          <div className="flex items-center gap-2">
            <div className="card-terminal__dots">
              <div className="card-terminal__dot card-terminal__dot--red" />
              <div className="card-terminal__dot card-terminal__dot--amber" />
              <div className="card-terminal__dot card-terminal__dot--green" />
            </div>
            <span className="card-terminal__path">spacenexus:~/subscribe</span>
          </div>
          <span className="badge badge-pro">RECOMMENDED</span>
        </div>
      )}

      {/* Status badges */}
      {isCurrentPlan && !isTrialing && (
        <div className="absolute top-3 right-3 z-10">
          <span className="badge badge-live">ACTIVE</span>
        </div>
      )}
      {isTrialingThis && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(255, 179, 2, 0.1)', color: '#FFB302', border: '1px solid rgba(255, 179, 2, 0.2)' }}>
            TRIAL — {daysLeft}d LEFT
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Tier header */}
        <div className="mb-5">
          <p className="text-[9px] font-semibold uppercase tracking-widest font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
            {tier.clearance}
          </p>
          <h3 className="text-xl font-bold text-display">{tier.label}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{planName} Plan</p>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-3xl font-bold font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>
            ${price === 0 ? '0' : price}
          </span>
          {price > 0 && (
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{period}</span>
          )}
        </div>
        {savings && savings > 0 ? (
          <p className="text-xs font-medium mb-4" style={{ color: '#56F000' }}>Save {savings}% with annual</p>
        ) : trialDays && trialDays > 0 ? (
          <p className="text-xs mb-4" style={{ color: 'var(--accent-secondary)' }}>{trialDays}-day full access trial</p>
        ) : (
          <div className="mb-4" />
        )}

        {/* Features */}
        <ul className="space-y-2.5 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#56F000' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        {isCurrentPlan && !isTrialing ? (
          <button disabled className="w-full py-3 px-4 rounded text-sm font-medium cursor-not-allowed"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
            Current Plan
          </button>
        ) : isTrialingThis ? (
          <div className="space-y-2">
            <button disabled className="w-full py-3 px-4 rounded text-sm font-semibold cursor-not-allowed"
              style={{ background: 'rgba(255,179,2,0.1)', color: '#FFB302', border: '1px solid rgba(255,179,2,0.2)' }}>
              Trial Active — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
            </button>
            <button
              onClick={() => onSubscribe(planId as SubscriptionTier, isYearly ? 'year' : 'month')}
              disabled={isCheckingOut}
              className="w-full py-2 px-4 rounded text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
              {isCheckingOut ? 'Redirecting...' : 'Subscribe Now'}
            </button>
          </div>
        ) : planId === 'free' ? (
          <Link href="/register"
            className="block w-full py-3 px-4 rounded text-sm font-medium text-center transition-colors"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
            Get Started Free
          </Link>
        ) : isLoggedIn && trialDays && !isTrialing ? (
          <div className="space-y-2">
            <button
              onClick={() => onStartTrial(planId as SubscriptionTier)}
              disabled={isStartingTrial}
              className={`w-full py-3 px-4 rounded text-sm font-semibold text-white transition-all disabled:opacity-50 ${
                highlighted ? 'hover:shadow-lg hover:shadow-indigo-500/20' : ''
              }`}
              style={{ background: highlighted ? 'var(--accent-primary)' : 'var(--bg-hover)', color: highlighted ? '#fff' : 'var(--text-primary)', border: highlighted ? 'none' : '1px solid var(--border-default)' }}>
              {isStartingTrial ? 'Starting Trial...' : `Start ${trialDays}-Day Free Trial`}
            </button>
            <button
              onClick={() => onSubscribe(planId as SubscriptionTier, isYearly ? 'year' : 'month')}
              disabled={isCheckingOut}
              className="w-full py-2 px-4 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
              {isCheckingOut ? 'Redirecting...' : 'Or Subscribe Now'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (!isLoggedIn) return;
              onSubscribe(planId as SubscriptionTier, isYearly ? 'year' : 'month');
            }}
            disabled={isCheckingOut}
            className={`w-full py-3 px-4 rounded text-sm font-semibold transition-all disabled:opacity-50 ${
              highlighted ? 'hover:shadow-lg hover:shadow-indigo-500/20' : ''
            }`}
            style={{ background: highlighted ? 'var(--accent-primary)' : 'var(--bg-hover)', color: highlighted ? '#fff' : 'var(--text-primary)', border: highlighted ? 'none' : '1px solid var(--border-default)' }}>
            {isCheckingOut ? 'Redirecting...' : isLoggedIn ? 'Subscribe Now' : 'Sign In to Subscribe'}
          </button>
        )}
      </div>
    </div>
  );
}
