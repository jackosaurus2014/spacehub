'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import FAQAccordion, { FAQItem } from '@/components/support/FAQAccordion';
import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_CATEGORIES = [
  { id: 'general', label: 'General', icon: '🌐' },
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'data', label: 'Data & Content', icon: '📊' },
  { id: 'technical', label: 'Technical', icon: '🔧' },
];

const FAQ_ITEMS: FAQItem[] = [
  // General Questions
  {
    id: 'gen-1',
    category: 'general',
    question: 'What is SpaceNexus?',
    answer:
      'SpaceNexus is a comprehensive platform for space industry intelligence. We provide real-time data, market analysis, mission tracking, regulatory updates, and business opportunities for professionals working in or following the space sector.',
  },
  {
    id: 'gen-2',
    category: 'general',
    question: 'Who is SpaceNexus designed for?',
    answer:
      'SpaceNexus serves a wide range of users including aerospace engineers, space investors, industry analysts, regulatory professionals, journalists, researchers, and space enthusiasts. Our platform scales from free access for casual users to enterprise solutions for organizations.',
  },
  {
    id: 'gen-3',
    category: 'general',
    question: 'Is SpaceNexus free to use?',
    answer:
      'Yes! SpaceNexus offers a free Explorer tier that gives you access to core features including news feeds, satellite tracking, mission countdowns, and public data. Premium tiers (Professional and Enterprise) unlock advanced analytics, AI-powered insights, export capabilities, and priority support.',
  },
  {
    id: 'gen-4',
    category: 'general',
    question: 'How often is the data updated?',
    answer:
      'Our data is updated continuously. News feeds refresh every few minutes, launch schedules are updated in real-time, and market data is refreshed throughout trading hours. Historical data and regulatory information are updated as new information becomes available.',
  },
  {
    id: 'gen-5',
    category: 'general',
    question: 'Can I use SpaceNexus for commercial purposes?',
    answer:
      'Yes, with appropriate licensing. Free tier users can use the platform for personal and educational purposes. Professional and Enterprise subscribers have commercial usage rights. Please review our Terms of Service or contact our sales team for specific licensing questions.',
  },
  {
    id: 'gen-6',
    category: 'general',
    question: 'Does SpaceNexus have a mobile app?',
    answer:
      'Yes! SpaceNexus is available as a native app on both Android (Google Play) and iOS (App Store), as well as a progressive web app (PWA) that works on any device. The mobile apps include native push notifications, biometric authentication (Face ID / Touch ID), and offline access.',
  },

  // Account Questions
  {
    id: 'acc-1',
    category: 'account',
    question: 'How do I create an account?',
    answer:
      'Click the "Get Started" or "Sign Up" button on our homepage. You can register with your email address and create a password. After registration, you will have access to the free Explorer tier immediately.',
  },
  {
    id: 'acc-2',
    category: 'account',
    question: 'How do I upgrade my subscription?',
    answer:
      'Log into your account and navigate to the Pricing page. Select the plan that best fits your needs and follow the checkout process. Upgrades take effect immediately, and you will be charged a prorated amount for the remainder of your billing cycle.',
  },
  {
    id: 'acc-3',
    category: 'account',
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Yes, you can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period. We do not offer refunds for partial months, but you will not be charged again after cancellation.',
  },
  {
    id: 'acc-4',
    category: 'account',
    question: 'How do I reset my password?',
    answer:
      'Click "Forgot Password" on the login page and enter your email address. We will send you a secure link to reset your password. The link expires after 24 hours for security purposes.',
  },
  {
    id: 'acc-5',
    category: 'account',
    question: 'Can I change my email address?',
    answer:
      'Yes, you can update your email address from your account settings. You will need to verify the new email address before the change takes effect. Your login credentials will be updated automatically.',
  },
  {
    id: 'acc-6',
    category: 'account',
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards (Visa, MasterCard, American Express, Discover) and PayPal. Enterprise customers can also pay by invoice. All payments are processed securely through Stripe.',
  },
  {
    id: 'acc-7',
    category: 'account',
    question: 'How do I delete my account?',
    answer:
      'You can permanently delete your account and all associated data at any time through the Account Settings page at spacenexus.us/account. Account deletion is immediate and irreversible. All your personal data, preferences, API keys, and other account information will be permanently removed.',
  },

  // Data Questions
  {
    id: 'data-1',
    category: 'data',
    question: 'Where does SpaceNexus get its data?',
    answer:
      'We aggregate data from multiple authoritative sources including NASA, ESA, SpaceX, official regulatory bodies (FAA, FCC), financial markets, industry publications, and our own research team. All sources are verified for accuracy and reliability.',
  },
  {
    id: 'data-2',
    category: 'data',
    question: 'Can I export data from SpaceNexus?',
    answer:
      'Professional and Enterprise subscribers can export data in CSV, JSON, and PDF formats. Export capabilities vary by module - check the specific module documentation for details. Free tier users have limited export functionality.',
  },
  {
    id: 'data-3',
    category: 'data',
    question: 'How accurate is the launch schedule data?',
    answer:
      'We strive for maximum accuracy, but launch schedules are subject to change by launch providers. We update our data as soon as schedule changes are announced. For mission-critical decisions, always verify with official sources.',
  },
  {
    id: 'data-4',
    category: 'data',
    question: 'Do you provide API access?',
    answer:
      'Yes, Enterprise subscribers have access to our REST API for programmatic data access. The API includes rate limiting and requires authentication. Contact our sales team for API documentation and pricing.',
  },
  {
    id: 'data-5',
    category: 'data',
    question: 'How far back does historical data go?',
    answer:
      'Historical data availability varies by data type. Launch data goes back to the beginning of the space age. Market data typically covers 5+ years. News archives extend back 2+ years. Some specialized datasets may have different coverage periods.',
  },
  {
    id: 'data-6',
    category: 'data',
    question: 'Can I request specific data or features?',
    answer:
      'Absolutely! We welcome feature requests and data suggestions. Use the "Request Feature" option in the navigation menu or contact us directly. Enterprise customers receive priority consideration for custom data requests.',
  },

  // Technical Questions
  {
    id: 'tech-1',
    category: 'technical',
    question: 'What browsers are supported?',
    answer:
      'SpaceNexus supports the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience. Some advanced visualization features may require WebGL support.',
  },
  {
    id: 'tech-2',
    category: 'technical',
    question: 'Why is the page loading slowly?',
    answer:
      'Slow loading can be caused by your internet connection, browser extensions, or heavy data visualizations. Try clearing your browser cache, disabling extensions, or using a wired connection. If problems persist, contact our support team.',
  },
  {
    id: 'tech-3',
    category: 'technical',
    question: 'How do I report a bug?',
    answer:
      'Please use the "Report Issue" option in the navigation menu or contact us through the Contact page. Include details about what you were doing, the expected behavior, and any error messages. Screenshots are very helpful.',
  },
  {
    id: 'tech-4',
    category: 'technical',
    question: 'Is my data secure?',
    answer:
      'Yes, we take security seriously. All data is transmitted over HTTPS encryption. We use industry-standard security practices including secure authentication, regular security audits, and encrypted data storage.',
  },
  {
    id: 'tech-5',
    category: 'technical',
    question: 'Do you support Single Sign-On (SSO)?',
    answer:
      'SSO is available for Enterprise customers. We support SAML 2.0 and OAuth integrations with major identity providers including Okta, Azure AD, and Google Workspace. Contact our sales team to configure SSO for your organization.',
  },
  {
    id: 'tech-6',
    category: 'technical',
    question: 'How do I clear my cache and cookies?',
    answer:
      'The process varies by browser. Generally, go to your browser settings, find the Privacy or History section, and select the option to clear browsing data. Make sure to select cached images and files. Note that this will log you out of SpaceNexus.',
  },
  {
    id: 'tech-7',
    category: 'technical',
    question: 'Can I customize my dashboard?',
    answer:
      'Yes! Professional and Enterprise users can customize their dashboards by adding, removing, and rearranging modules. Click the customize icon on any dashboard to enter edit mode. Free tier users have access to a fixed set of modules.',
  },
  {
    id: 'tech-8',
    category: 'technical',
    question: 'What are the system requirements?',
    answer:
      'SpaceNexus is a web-based platform that requires a modern browser and stable internet connection. For optimal performance, we recommend at least 4GB RAM and a screen resolution of 1280x720 or higher. 3D visualizations benefit from a dedicated graphics card.',
  },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen pb-12">
      <FAQSchema items={FAQ_ITEMS} />
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Frequently Asked Questions"
          subtitle="Find answers to common questions about SpaceNexus"
          icon="❓"
          accentColor="purple"
        >
          <Link href="/contact" className="btn-primary text-sm py-2 px-4">
            Contact Support
          </Link>
        </AnimatedPageHeader>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-10">
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for answers..."
              className="input pl-12 py-3 text-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
        </div>

        {/* FAQ Accordion */}
        <ScrollReveal><div className="max-w-4xl mx-auto">
          <FAQAccordion
            items={FAQ_ITEMS}
            categories={FAQ_CATEGORIES}
            searchQuery={searchQuery}
          />
        </div></ScrollReveal>

        {/* Still Have Questions */}
        <ScrollReveal><div className="max-w-2xl mx-auto mt-16">
          <div className="card p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Still Have Questions?</h2>
            <p className="text-slate-400 mb-6">
              Can&apos;t find what you&apos;re looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="btn-primary">
                Contact Support
              </Link>
              <a
                href="mailto:support@spacenexus.us"
                className="btn-secondary"
              >
                Email Us
              </a>
            </div>
          </div>
        </div></ScrollReveal>
      </div>
    </div>
  );
}
