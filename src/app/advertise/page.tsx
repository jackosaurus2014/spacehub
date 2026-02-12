'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from '@/lib/toast';

const AD_PRICING = [
  {
    name: 'Banner Ads',
    cpm: '$25',
    description: 'Standard display banners (728x90, 300x250) placed across module pages.',
    features: [
      'Targeted by module and audience',
      'Real-time impression tracking',
      'Daily budget controls',
      'Multiple creative sizes',
    ],
    popular: false,
  },
  {
    name: 'Native Content',
    cpm: '$40',
    description: 'Sponsored content cards that match the look and feel of SpaceNexus.',
    features: [
      'Blends with organic content',
      'Higher engagement rates',
      'Image + headline + description',
      'Click-through tracking',
    ],
    popular: true,
  },
  {
    name: 'Sponsored Articles',
    price: '$500/article',
    description: 'Full-length sponsored articles and thought leadership pieces.',
    features: [
      'Premium placement in News feed',
      'Authored content with your brand',
      'Extended audience reach',
      'Social sharing enabled',
    ],
    popular: false,
  },
  {
    name: 'Featured Job Listings',
    price: '$200/listing',
    description: 'Highlighted job postings in the Space Talent Hub module.',
    features: [
      'Priority placement in job search',
      'Highlighted with sponsor badge',
      '30-day listing duration',
      'Analytics on applicant interest',
    ],
    popular: false,
  },
];

const AUDIENCE_STATS = [
  { label: 'Monthly Active Users', value: '10K+', icon: 'users' },
  { label: 'Space Industry Professionals', value: '85%', icon: 'briefcase' },
  { label: 'Decision Makers', value: '45%', icon: 'chart' },
  { label: 'Average Session Duration', value: '8 min', icon: 'clock' },
];

const TARGET_MODULES = [
  'News & Media',
  'Market Intelligence',
  'Business Opportunities',
  'Mission Planning',
  'Space Operations',
  'Space Talent Hub',
  'Regulatory & Compliance',
  'Solar System Exploration',
  'Space Environment',
];

export default function AdvertisePage() {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    website: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      toast.warning('Please sign in to register as an advertiser');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/ads/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        toast.success('Registration submitted! We will review your application.');
      } else {
        toast.error(data.error?.message || 'Registration failed');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 pb-20">
      <PageHeader
        title="Advertise on SpaceNexus"
        subtitle="Reach Space Industry Decision Makers"
        description="Connect your brand with the most engaged audience of space professionals, engineers, and executives."
      />

      {/* Audience Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {AUDIENCE_STATS.map((stat) => (
          <div key={stat.label} className="card p-6 text-center">
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-star-300 text-sm">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Value Proposition */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-6">Why Advertise With Us</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="w-10 h-10 rounded-lg bg-nebula-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-nebula-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Niche B2B Audience</h3>
            <p className="text-star-300 text-sm">
              Reach space industry professionals, government contractors, and decision-makers
              actively researching space technology and business opportunities.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-10 h-10 rounded-lg bg-plasma-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-plasma-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Module Targeting</h3>
            <p className="text-star-300 text-sm">
              Target your ads to specific modules -- show launch vehicle ads in Mission Planning,
              or talent recruitment ads in the Space Talent Hub.
            </p>
          </div>

          <div className="card p-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Transparent Analytics</h3>
            <p className="text-star-300 text-sm">
              Real-time dashboard with impressions, clicks, CTR, and spend tracking.
              Full visibility into campaign performance by module and day.
            </p>
          </div>
        </div>
      </section>

      {/* Targetable Modules */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-4">Targetable Modules</h2>
        <p className="text-star-300 mb-6">
          Place your ads in the exact context where your audience is most engaged.
        </p>
        <div className="flex flex-wrap gap-3">
          {TARGET_MODULES.map((mod) => (
            <span
              key={mod}
              className="px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm"
            >
              {mod}
            </span>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-2">Advertising Rates</h2>
        <p className="text-star-300 mb-8">
          Premium rates reflecting our highly engaged, niche B2B space industry audience.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {AD_PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`card p-6 relative ${
                plan.popular ? 'border-nebula-500 glow-border' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-nebula-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
              <p className="text-star-300 text-sm mb-4">{plan.description}</p>

              <div className="mb-4">
                <span className="text-3xl font-bold text-white">
                  {plan.cpm || plan.price}
                </span>
                {plan.cpm && (
                  <span className="text-star-300 text-sm ml-1">CPM</span>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-star-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Registration Form */}
      <section className="max-w-2xl mx-auto" id="register">
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Get Started</h2>
          <p className="text-star-300 mb-6">
            {session?.user
              ? 'Register as an advertiser to start creating campaigns.'
              : 'Sign in to your SpaceNexus account to register as an advertiser.'}
          </p>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Application Submitted</h3>
              <p className="text-star-300 mb-4">
                We will review your application and get back to you within 1-2 business days.
              </p>
              <Link
                href="/advertise/dashboard"
                className="text-nebula-400 hover:text-nebula-300 text-sm font-medium"
              >
                Go to Advertiser Dashboard
              </Link>
            </div>
          ) : !session?.user ? (
            <div className="text-center py-8">
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                Sign In to Get Started
              </Link>
              <p className="text-star-300 text-sm mt-4">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-nebula-400 hover:text-nebula-300">
                  Register for free
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-star-200 mb-1">
                  Company Name *
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="input w-full"
                  placeholder="Acme Space Technologies"
                />
              </div>

              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-star-200 mb-1">
                  Contact Name *
                </label>
                <input
                  id="contactName"
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="input w-full"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-star-200 mb-1">
                  Contact Email *
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="input w-full"
                  placeholder="john@acmespace.com"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-star-200 mb-1">
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="input w-full"
                  placeholder="https://acmespace.com"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Register as Advertiser'}
              </button>

              <p className="text-star-300 text-xs text-center">
                Your application will be reviewed by our team. Campaign creation
                will be available once approved.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
