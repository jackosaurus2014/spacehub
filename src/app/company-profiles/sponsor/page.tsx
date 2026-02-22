'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { toast } from '@/lib/toast';

interface SponsorTierInfo {
  name: string;
  price: string;
  yearlyPrice: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  tier: 'basic' | 'verified' | 'premium';
}

const SPONSOR_TIERS: SponsorTierInfo[] = [
  {
    name: 'Basic',
    price: 'Free',
    yearlyPrice: 'Free',
    description: 'Standard company profile listing with all core features.',
    features: [
      'Company profile page',
      'News article tagging',
      'Industry directory listing',
      'Public contact information',
      'Company events timeline',
    ],
    cta: 'Get Started Free',
    highlighted: false,
    tier: 'basic',
  },
  {
    name: 'Verified Sponsor',
    price: '$200/mo',
    yearlyPrice: '$2,000/yr',
    description: 'Stand out with a verified badge, priority placement, and enhanced profile.',
    features: [
      'Everything in Basic',
      'Verified badge on profile & listings',
      'Priority placement in search results',
      'Enhanced profile with verified data',
      'Monthly profile performance report',
      'Featured in industry directory',
    ],
    cta: 'Get Verified',
    highlighted: false,
    tier: 'verified',
  },
  {
    name: 'Premium Sponsor',
    price: '$500/mo',
    yearlyPrice: '$5,000/yr',
    description: 'Maximum visibility with custom branding, lead capture, and full analytics.',
    features: [
      'Everything in Verified',
      'Custom banner on profile page',
      'Custom company tagline',
      'Lead capture contact form',
      'Real-time analytics dashboard',
      'Top placement in all searches',
      'Featured products showcase',
      'Priority support',
    ],
    cta: 'Go Premium',
    highlighted: true,
    tier: 'premium',
  },
];

const ROI_STATS = [
  { label: 'Monthly Profile Views', value: '2,500+', description: 'Average for Tier 1 companies' },
  { label: 'Industry Professionals', value: '15,000+', description: 'Active SpaceNexus users' },
  { label: 'Companies Profiled', value: '100+', description: 'In our intelligence database' },
  { label: 'Decision Makers', value: '60%', description: 'Of our users are VP+ level' },
];

function SponsorPageInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const canceled = searchParams.get('canceled') === 'true';

  const handleCheckout = async (tier: 'verified' | 'premium') => {
    if (!session?.user) {
      toast.error('Please sign in to sponsor your company profile');
      return;
    }

    // User needs to specify which company — redirect to claim flow
    toast.error('Please claim your company profile first, then return here to sponsor');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Company Profiles', href: '/company-profiles' },
        { name: 'Sponsor' },
      ]} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Sponsor Your Company Profile"
          subtitle="Increase your visibility in the space industry. Verified badges, priority placement, lead capture, and analytics for your company profile."
          accentColor="amber"
        />

        {canceled && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-center">
            <p className="text-amber-400 text-sm">Checkout was canceled. You can try again when you are ready.</p>
          </div>
        )}

        {/* ROI Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {ROI_STATS.map((stat) => (
            <div key={stat.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-center">
              <div className="text-2xl font-bold text-amber-400">{stat.value}</div>
              <div className="text-sm font-medium text-slate-200 mt-1">{stat.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.description}</div>
            </div>
          ))}
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-800/60 rounded-xl p-1 border border-slate-700/50 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Yearly <span className="text-emerald-400 text-xs ml-1">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {SPONSOR_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-slate-800/60 rounded-2xl p-6 border ${
                tier.highlighted
                  ? 'border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'border-slate-700/50'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <h3 className="text-xl font-bold text-slate-100 mb-1">{tier.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  {billingCycle === 'monthly' ? tier.price : tier.yearlyPrice}
                </span>
                {tier.price !== 'Free' && (
                  <span className="text-slate-500 text-sm ml-1">
                    {billingCycle === 'monthly' ? '/month' : '/year'}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-6">{tier.description}</p>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                    <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.tier === 'basic' ? (
                <Link
                  href="/company-profiles"
                  className="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  {tier.cta}
                </Link>
              ) : (
                <button
                  onClick={() => handleCheckout(tier.tier as 'verified' | 'premium')}
                  disabled={loading === tier.tier}
                  className={`block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                  } disabled:opacity-60`}
                >
                  {loading === tier.tier ? 'Loading...' : tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-8">How Sponsorship Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Claim Profile', desc: 'Verify ownership of your company profile on SpaceNexus.' },
              { step: '2', title: 'Choose Tier', desc: 'Select Verified or Premium based on your visibility goals.' },
              { step: '3', title: 'Customize', desc: 'Add your banner, tagline, and enable lead capture forms.' },
              { step: '4', title: 'Track Results', desc: 'Monitor views, clicks, and inbound leads in real-time.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-3">
                  <span className="text-lg font-bold text-amber-400">{item.step}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1">{item.title}</h3>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-amber-500/10 via-slate-800/50 to-amber-500/10 border border-amber-500/20 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Ready to boost your visibility?</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Join leading space companies that use SpaceNexus to connect with customers, investors, and partners.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/company-profiles"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
            >
              Find Your Company
            </Link>
            <Link
              href="/contact"
              className="px-6 py-2.5 bg-slate-700 text-slate-200 font-semibold rounded-xl hover:bg-slate-600 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SponsorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SponsorPageInner />
    </Suspense>
  );
}
