'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  FAQ data by category                                               */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
}

interface HelpCategory {
  id: string;
  title: string;
  brief: string;
  href?: string;
  icon: React.ReactNode;
  faqs: FAQItem[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    brief: 'New to SpaceNexus? Start here',
    href: '/getting-started',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    faqs: [
      {
        question: 'How do I create a SpaceNexus account?',
        answer:
          'Visit the registration page and enter your email address and a password. You will receive a verification email to confirm your account. Once verified, you have immediate access to the free Explorer tier with core features including news feeds, satellite tracking, and mission countdowns.',
      },
      {
        question: 'What is included in the free plan?',
        answer:
          'The free Explorer tier includes access to news feeds, satellite tracking, launch schedules, public company profiles, the space glossary, and community forums. You can explore most modules with a generous free allowance before upgrading.',
      },
      {
        question: 'How do I navigate the platform?',
        answer:
          'Use the left sidebar or top navigation to browse modules grouped into Explore, Intelligence, Business, and Tools. The command palette (press Ctrl+K) provides instant search across all modules. The Getting Started guide walks you through each feature step by step.',
      },
      {
        question: 'Can I use SpaceNexus on my phone?',
        answer:
          'Yes. SpaceNexus is a progressive web app (PWA) that works on any device. You can install it to your home screen for an app-like experience with push notifications, offline access, and swipe navigation. Native Android and iOS apps are also available.',
      },
    ],
  },
  {
    id: 'account-billing',
    title: 'Account & Billing',
    brief: 'Subscription, billing, and cancellation questions',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    faqs: [
      {
        question: 'What subscription plans are available?',
        answer:
          'SpaceNexus offers three tiers: Explorer (free), Professional ($29/month), and Enterprise (custom pricing). Professional unlocks AI market analysis, custom alerts, data exports, and API access. Enterprise adds team management, dedicated support, and higher rate limits. Visit our pricing page for full details.',
      },
      {
        question: 'How do I upgrade or downgrade my plan?',
        answer:
          'Go to Account Settings and select the Billing tab. You can upgrade instantly and your new features will activate immediately. Downgrades take effect at the end of your current billing period so you keep access to premium features until then.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer:
          'You can cancel anytime from Account Settings under the Billing tab. Your premium features remain active until the end of the current billing period. No cancellation fees apply. Your data and saved watchlists are preserved if you decide to resubscribe later.',
      },
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major credit and debit cards (Visa, Mastercard, American Express) through Stripe. Enterprise customers can also pay via invoice with net-30 terms. All payments are processed securely and encrypted end-to-end.',
      },
    ],
  },
  {
    id: 'satellite-tracking',
    title: 'Satellite Tracking',
    brief: 'How to use the tracker and set up alerts',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    faqs: [
      {
        question: 'How does the satellite tracker work?',
        answer:
          'The satellite tracker provides real-time orbital visualization of thousands of active satellites using TLE data from CelesTrak and Space-Track. You can search by name or NORAD ID, view orbital parameters, and monitor conjunction events. The 3D globe view shows live positions with ground tracks.',
      },
      {
        question: 'Can I set alerts for specific satellites?',
        answer:
          'Yes. Navigate to the Alerts page and create a rule for satellite passes, conjunction warnings, or status changes. You can receive notifications via email or in-app. Professional users can also set up webhook integrations for programmatic delivery.',
      },
      {
        question: 'How accurate is the tracking data?',
        answer:
          'Orbital data is sourced from CelesTrak and the 18th Space Defense Squadron catalog. TLE data is updated multiple times daily. Position accuracy depends on TLE age and orbital perturbations but is generally within a few kilometers for recently updated objects.',
      },
    ],
  },
  {
    id: 'market-intelligence',
    title: 'Market Intelligence',
    brief: 'How to read dashboards and set price alerts',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    faqs: [
      {
        question: 'What market data is available on SpaceNexus?',
        answer:
          'SpaceNexus provides market intelligence across 15+ segments including launch services, satellite communications, Earth observation, and in-space manufacturing. Data includes funding rounds, M&A activity, government contract awards, executive moves, and AI-powered trend analysis.',
      },
      {
        question: 'How do I set up price or market alerts?',
        answer:
          'Go to the Alerts page and select Market Intelligence as the alert type. You can create rules for funding announcements, company news, sector price movements, and regulatory changes. Alerts are delivered via email or in-app notification within minutes of detection.',
      },
      {
        question: 'How do I read the market dashboards?',
        answer:
          'Each dashboard shows key metrics at the top (total market size, funding volume, deal count) followed by interactive charts and tables. Use the time range selector to adjust the period. Click any data point to drill down into the underlying deals or events. The AI Insights panel highlights notable trends.',
      },
    ],
  },
  {
    id: 'data-apis',
    title: 'Data & APIs',
    brief: 'Data freshness and API access information',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    faqs: [
      {
        question: 'How fresh is the data on SpaceNexus?',
        answer:
          'Data freshness varies by type. News feeds refresh every few minutes via automated cron jobs. Satellite positions update in near real-time. Launch schedules are updated as soon as providers announce changes. Market intelligence and company profiles are refreshed daily.',
      },
      {
        question: 'How do I get API access?',
        answer:
          'API access is available on the Professional and Enterprise tiers. Navigate to the Developer Portal to generate your API key. The REST API provides endpoints for satellite data, launch schedules, company profiles, market intelligence, and news feeds with versioned endpoints and JSON responses.',
      },
      {
        question: 'What are the API rate limits?',
        answer:
          'Professional plan users get 1,000 requests per hour. Enterprise customers receive higher rate limits based on their contract. All responses include rate limit headers so you can monitor usage. If you need higher limits, contact our sales team to discuss Enterprise options.',
      },
      {
        question: 'What data sources does SpaceNexus aggregate?',
        answer:
          'We aggregate data from over 50 authoritative sources including NASA, ESA, NOAA, FAA, FCC, the U.S. Space Force, CelesTrak, Space-Track, SEC filings, SAM.gov procurement records, and industry databases. News comes from 53 RSS feeds and 39 blog sources.',
      },
    ],
  },
  {
    id: 'contact-support',
    title: 'Contact Support',
    brief: 'Get in touch with our team',
    href: '/contact',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    faqs: [
      {
        question: 'How do I contact SpaceNexus support?',
        answer:
          'You can reach us via the Contact page, or email us directly at support@spacenexus.us. Enterprise customers have access to priority support with a dedicated account manager. We aim to respond within 24 hours on business days.',
      },
      {
        question: 'Is there live chat support?',
        answer:
          'Enterprise customers receive live chat support during business hours (9 AM - 6 PM ET, Monday through Friday). All users can submit support requests through the contact form or via email, and we respond as quickly as possible.',
      },
      {
        question: 'How do I report a bug or request a feature?',
        answer:
          'Use the "Send Feedback" option in the navigation menu or visit the Contact page. You can also submit feature requests in the Community Forums where other users can upvote ideas. We review all feedback and prioritize based on community impact.',
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Collect ALL FAQ items for JSON-LD                                  */
/* ------------------------------------------------------------------ */

const ALL_FAQ_ITEMS: FAQItem[] = HELP_CATEGORIES.flatMap((cat) => cat.faqs);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [openFaqIds, setOpenFaqIds] = useState<Set<string>>(new Set());

  /* ---- search filtering ---- */
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return HELP_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return HELP_CATEGORIES.map((cat) => ({
      ...cat,
      faqs: cat.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.faqs.length > 0);
  }, [searchQuery]);

  const toggleCategory = (id: string) => {
    setExpandedCategory((prev) => (prev === id ? null : id));
  };

  const toggleFaq = (key: string) => {
    setOpenFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* ---- JSON-LD FAQPage structured data for all questions ---- */
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALL_FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen pb-16">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="container mx-auto px-4">
        {/* ---- Header ---- */}
        <div className="text-center pt-12 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/[0.08] mb-6">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Help Center</h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Everything you need to get the most out of SpaceNexus
          </p>
        </div>

        {/* ---- Search Bar ---- */}
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl pl-12 pr-10 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-slate-500 text-sm mt-2 pl-1">
              {filteredCategories.reduce((sum, c) => sum + c.faqs.length, 0)} result
              {filteredCategories.reduce((sum, c) => sum + c.faqs.length, 0) !== 1 ? 's' : ''}{' '}
              found
            </p>
          )}
        </div>

        {/* ---- Category Cards ---- */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white/[0.06] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">No results found</h3>
            <p className="text-slate-400 mb-6">
              Try a different search term or browse all categories.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {filteredCategories.map((category) => {
              const isExpanded = expandedCategory === category.id || !!searchQuery.trim();

              return (
                <div
                  key={category.id}
                  className={`rounded-xl border transition-all duration-300 ${
                    isExpanded
                      ? 'bg-white/[0.06] border-white/[0.12] md:col-span-2 lg:col-span-3'
                      : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
                  }`}
                >
                  {/* Card header — always visible */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full p-5 flex items-start gap-4 text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/[0.08] flex items-center justify-center text-blue-400">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-white">
                          {category.title}
                        </h2>
                        <svg
                          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{category.brief}</p>
                      {!isExpanded && (
                        <p className="text-xs text-slate-500 mt-2">
                          {category.faqs.length} articles
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Expanded FAQ items */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] px-5 pb-4">
                      {category.faqs.map((faq, idx) => {
                        const faqKey = `${category.id}-${idx}`;
                        const isOpen = openFaqIds.has(faqKey);

                        return (
                          <div
                            key={faqKey}
                            className="border-b border-white/[0.04] last:border-b-0"
                          >
                            <button
                              onClick={() => toggleFaq(faqKey)}
                              className="w-full py-3.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded"
                              aria-expanded={isOpen}
                            >
                              <span className="font-medium text-sm text-slate-200 pr-4">
                                {faq.question}
                              </span>
                              <span
                                className={`flex-shrink-0 w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              >
                                <svg
                                  className="w-3 h-3 text-slate-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </span>
                            </button>
                            <div
                              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                              }`}
                            >
                              <p className="text-sm text-slate-400 leading-relaxed pb-3 pl-1">
                                {faq.answer}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Category-specific link */}
                      {category.href && (
                        <div className="pt-3">
                          <Link
                            href={category.href}
                            className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
                          >
                            {category.id === 'contact-support'
                              ? 'Contact us'
                              : `Go to ${category.title}`}
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7l5 5m0 0l-5 5m5-5H6"
                              />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- Still need help? ---- */}
        <div className="max-w-2xl mx-auto mt-16">
          <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-8 text-center">
            <div className="w-14 h-14 bg-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-5">
              <svg
                className="w-7 h-7 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Still need help?</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Can&apos;t find what you&apos;re looking for? Our support team is ready to assist.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors"
              >
                Contact Support
              </Link>
              <a
                href="mailto:support@spacenexus.us"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-colors"
              >
                Email support@spacenexus.us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
