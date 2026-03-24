'use client';

import Link from 'next/link';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

const API_FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    title: 'RESTful Endpoints',
    description: 'Clean, well-documented REST API with predictable resource-oriented URLs and standard HTTP methods.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'JSON Responses',
    description: 'All endpoints return structured JSON with consistent schemas, pagination, and error handling.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: '99.9% Uptime SLA',
    description: 'Enterprise-grade infrastructure with redundancy, auto-scaling, and global CDN distribution.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'API Key Authentication',
    description: 'Secure API key authentication with per-key rate limiting, usage analytics, and instant revocation.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: 'Webhooks',
    description: 'Real-time event notifications for launches, funding rounds, executive moves, and breaking news.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    title: 'Rich Data Coverage',
    description: 'Access launches, companies, satellites, market data, news, funding rounds, and 30+ data categories.',
  },
];

const PRICING_TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Get started with core space data',
    features: [
      '100 requests/day',
      'News & events data',
      'Launch schedule endpoints',
      'Basic company profiles',
      'Community support',
      'JSON responses',
    ],
    cta: 'Get Started',
    ctaHref: '/register',
    highlight: false,
  },
  {
    name: 'Developer',
    price: '$29',
    period: '/mo',
    description: 'Full access for applications and integrations',
    features: [
      '5,000 requests/day',
      'All API endpoints',
      'Webhook notifications',
      'Market intelligence data',
      'Satellite tracking data',
      'Company financials',
      'Email support',
      'Usage analytics dashboard',
    ],
    cta: 'Start Building',
    ctaHref: '/register',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/mo',
    description: 'Maximum throughput with premium support',
    features: [
      '50,000 requests/day',
      'All Developer features',
      'Priority support (< 4h SLA)',
      'Custom endpoints on request',
      'Bulk data exports',
      'Dedicated account manager',
      'SSO integration',
      'Custom rate limits',
    ],
    cta: 'Contact Sales',
    ctaHref: '/register',
    highlight: false,
  },
];

const CODE_EXAMPLE = `curl -X GET "https://api.spacenexus.us/v1/launches/upcoming" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# Response
{
  "data": [
    {
      "id": "launch_2026_034",
      "mission": "Starlink Group 12-5",
      "provider": "SpaceX",
      "vehicle": "Falcon 9",
      "date": "2026-03-18T14:30:00Z",
      "site": "KSC LC-39A",
      "status": "go"
    }
  ],
  "meta": {
    "total": 47,
    "page": 1,
    "per_page": 20
  }
}`;

export default function ApiAccessPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.06] via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/[0.04] rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Developer API
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                SpaceNexus API
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                Build space intelligence into your applications. Access real-time launch data, company profiles, market intelligence, and more through a simple REST API.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all shadow-lg shadow-white/[0.05]"
                >
                  Get Your API Key
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/developer/docs"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-300 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.12] rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  Read the Docs
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Built for developers</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Everything you need to integrate space industry data into your products
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {API_FEATURES.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.1] hover:bg-white/[0.06] transition-all h-full">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* Code Example */}
      <div className="container mx-auto px-4 py-16">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">Simple to integrate</h2>
              <p className="text-slate-400">One API call to get upcoming launch data</p>
            </div>

            <div className="bg-[#0d1117] border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-slate-500 ml-2 font-mono">bash</span>
              </div>
              <pre className="p-4 sm:p-6 overflow-x-auto text-sm leading-relaxed">
                <code className="text-slate-300 font-mono whitespace-pre">{CODE_EXAMPLE}</code>
              </pre>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Pricing Tiers */}
      <div className="container mx-auto px-4 py-16">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">API Pricing</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Start free, scale as you grow. All plans include core API access.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <StaggerItem key={tier.name}>
              <div
                className={`relative rounded-2xl p-6 sm:p-8 h-full flex flex-col ${
                  tier.highlight
                    ? 'bg-gradient-to-b from-indigo-500/[0.12] to-white/[0.04] border-2 border-indigo-500/30'
                    : 'bg-white/[0.04] border border-white/[0.06]'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{tier.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">{tier.price}</span>
                    <span className="text-slate-400 text-sm">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.ctaHref}
                  className={`block text-center px-6 py-3 rounded-lg text-sm font-semibold transition-all ${
                    tier.highlight
                      ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/[0.05]'
                      : 'bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.06]'
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* Bottom CTA */}
      <div className="container mx-auto px-4 py-16">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-white/[0.06] via-white/[0.04] to-white/[0.06] border border-white/[0.06] rounded-2xl p-8 sm:p-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to build?</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Sign up for free and get your API key in under a minute. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all shadow-lg shadow-white/[0.05]"
              >
                Get Started Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/developer/docs"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                View API Documentation
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['api-access']} />
      </div>
    </div>
  );
}
