'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import FAQAccordion, { FAQItem } from '@/components/support/FAQAccordion';
import FAQSchema from '@/components/seo/FAQSchema';

const FAQ_CATEGORIES = [
  { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
  { id: 'features', label: 'Platform Features', icon: '🛰️' },
  { id: 'investors', label: 'For Investors', icon: '📈' },
  { id: 'entrepreneurs', label: 'For Entrepreneurs', icon: '💡' },
  { id: 'technical', label: 'Technical', icon: '🔧' },
];

const FAQ_ITEMS: FAQItem[] = [
  // Getting Started
  {
    id: 'gs-1',
    category: 'getting-started',
    question: 'What is SpaceNexus?',
    answer:
      'SpaceNexus is a comprehensive space industry intelligence platform that brings together real-time satellite tracking, market analysis, company profiles, regulatory updates, and business opportunities in one place. It is built for aerospace professionals, investors, entrepreneurs, and analysts who need actionable data on the commercial space economy.',
  },
  {
    id: 'gs-2',
    category: 'getting-started',
    question: 'How do I create an account?',
    answer:
      'Click "Get Started" on the homepage or visit the registration page. Enter your email address and create a password, and you will receive a verification email to confirm your account. Once verified, you have immediate access to the free Explorer tier with core features like news feeds, satellite tracking, and mission countdowns.',
  },
  {
    id: 'gs-3',
    category: 'getting-started',
    question: 'Is SpaceNexus free?',
    answer:
      'Yes, SpaceNexus offers a free Explorer tier that includes access to news feeds, satellite tracking, launch schedules, and public company profiles. Premium tiers (Professional and Enterprise) unlock advanced features such as AI-powered market analysis, custom alerts, data exports, and API access. Visit our pricing page for full plan details.',
  },
  {
    id: 'gs-4',
    category: 'getting-started',
    question: 'What data sources does SpaceNexus use?',
    answer:
      'We aggregate data from over 50 authoritative sources including NASA, ESA, NOAA, FAA, FCC, and the U.S. Space Force. Our platform ingests 53 RSS news feeds, 39 blog sources, and real-time telemetry from satellite tracking networks. Financial data comes from SEC filings, SAM.gov procurement records, and industry databases.',
  },
  {
    id: 'gs-5',
    category: 'getting-started',
    question: 'How often is data updated?',
    answer:
      'Data freshness varies by type. News feeds refresh every few minutes via automated cron jobs. Satellite positions update in near real-time. Launch schedules are updated as soon as providers announce changes. Market intelligence and company profiles are refreshed daily, while regulatory filings are ingested as they are published.',
  },

  // Platform Features
  {
    id: 'pf-1',
    category: 'features',
    question: 'What is the satellite tracker?',
    answer:
      'The satellite tracker provides real-time orbital visualization of thousands of active satellites, including Starlink, OneWeb, and government constellations. You can search by name or NORAD ID, view orbital parameters, and monitor conjunction events. The 3D globe view shows live positions with ground tracks and coverage footprints.',
  },
  {
    id: 'pf-2',
    category: 'features',
    question: 'How does the AI market analysis work?',
    answer:
      'Our AI-powered market intelligence uses Claude to analyze trends across the space economy, categorize news by sector and sentiment, and surface actionable insights. The AI Copilot in the marketplace can help match RFQ requirements to qualified suppliers. Visit the market intelligence page to explore sector reports, funding trends, and startup tracking.',
  },
  {
    id: 'pf-3',
    category: 'features',
    question: 'Can I track specific companies?',
    answer:
      'Yes. The company profiles directory covers 100+ space companies across all tiers, from SpaceX and Lockheed Martin to emerging startups. Each profile includes financials, satellite assets, facility locations, recent news mentions, and industry scores. You can add companies to your watchlist for real-time updates on executive moves, contract awards, and funding rounds.',
  },
  {
    id: 'pf-4',
    category: 'features',
    question: 'What space industry tools are available?',
    answer:
      'SpaceNexus includes a mission cost calculator, launch window planner, orbital mechanics calculator, link budget calculator, constellation designer, and power budget tool. The marketplace connects buyers with verified suppliers, and the procurement intelligence module tracks government contract awards from SAM.gov and SBIR programs.',
  },
  {
    id: 'pf-5',
    category: 'features',
    question: 'How do I set up custom alerts?',
    answer:
      'Navigate to the alerts page to create rules for the events you care about, such as launch schedule changes, company news, regulatory filings, or conjunction warnings. Alerts can be delivered via email or in-app notifications. Professional and Enterprise users can set up webhook integrations for programmatic alert delivery.',
  },

  // For Investors
  {
    id: 'inv-1',
    category: 'investors',
    question: 'How can SpaceNexus help with space investment due diligence?',
    answer:
      'SpaceNexus provides comprehensive company profiles with financial data, satellite asset inventories, facility locations, and competitive scoring. The funding tracker shows recent investment rounds across the industry, while the deal flow database surfaces active opportunities. Use the company comparison tool to benchmark targets side by side.',
  },
  {
    id: 'inv-2',
    category: 'investors',
    question: 'What market sizing data is available?',
    answer:
      'The market sizing module provides TAM/SAM/SOM analysis across 15+ space economy segments including launch services, satellite communications, Earth observation, and in-space manufacturing. Data is sourced from government budgets, SEC filings, and industry reports, with historical trends and forward projections.',
  },
  {
    id: 'inv-3',
    category: 'investors',
    question: 'How does the deal flow database work?',
    answer:
      'The deal flow page aggregates funding rounds, M&A activity, SPAC transactions, and government contract awards across the space industry. You can filter by deal type, investment stage, sector, and dollar amount. Each entry links to the relevant company profile for deeper analysis and includes source citations.',
  },

  // For Entrepreneurs
  {
    id: 'ent-1',
    category: 'entrepreneurs',
    question: 'How can SpaceNexus help me build a space startup?',
    answer:
      'SpaceNexus offers tools purpose-built for space entrepreneurs: the startup tracker benchmarks your company against peers, the business model explorer covers proven space business models, and the customer discovery module helps validate market demand. The investment thesis builder helps you craft a compelling pitch backed by real market data.',
  },
  {
    id: 'ent-2',
    category: 'entrepreneurs',
    question: 'What regulatory compliance tools are available?',
    answer:
      'The compliance hub covers FCC spectrum licensing, FAA launch permits, ITAR/EAR export controls, and international space treaties. The regulatory calendar tracks upcoming deadlines and comment periods. The regulation explainers break down complex rules into plain language, and the regulatory risk analyzer assesses compliance exposure for your specific activities.',
  },
  {
    id: 'ent-3',
    category: 'entrepreneurs',
    question: 'How do I find space industry suppliers?',
    answer:
      'The marketplace search connects you with verified suppliers across all space industry categories including components, testing, launch services, and ground segment. You can post an RFQ to receive competitive proposals, or use the AI Copilot to automatically match your requirements with qualified providers based on capabilities and certifications.',
  },

  // Technical
  {
    id: 'tech-1',
    category: 'technical',
    question: 'Is there an API available?',
    answer:
      'Yes. The SpaceNexus API provides programmatic access to satellite data, launch schedules, company profiles, market intelligence, and news feeds. API keys are managed through the developer portal. The REST API includes rate limiting, versioned endpoints (v1), and returns JSON responses. Enterprise customers receive higher rate limits and priority support.',
  },
  {
    id: 'tech-2',
    category: 'technical',
    question: 'Does SpaceNexus work on mobile?',
    answer:
      'Yes. SpaceNexus is available as a progressive web app (PWA) that works on any device, plus native apps on Android and iOS. Mobile features include push notifications, offline access to saved data, biometric authentication, and swipe gestures for navigation. The responsive design adapts all modules to smaller screens.',
  },
  {
    id: 'tech-3',
    category: 'technical',
    question: 'Is my data secure?',
    answer:
      'Security is a top priority. All traffic is encrypted via HTTPS with strict security headers. Authentication uses bcrypt-hashed passwords with email verification and CSRF protection. We conduct regular security audits, implement rate limiting on all endpoints, and use input sanitization throughout the platform. You can delete your account and all associated data at any time.',
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
        <ScrollReveal>
          <div className="max-w-xl mx-auto mb-10">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="search"
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
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* FAQ Accordion */}
        <ScrollReveal>
          <div className="max-w-4xl mx-auto">
            <FAQAccordion items={FAQ_ITEMS} categories={FAQ_CATEGORIES} searchQuery={searchQuery} />
          </div>
        </ScrollReveal>

        {/* Still Have Questions */}
        <ScrollReveal>
          <div className="max-w-2xl mx-auto mt-16">
            <div className="card p-8 text-center bg-gradient-to-br from-slate-800/50 to-slate-800">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent mb-3">
                Still Have Questions?
              </h2>
              <p className="text-slate-400 mb-6">
                Can&apos;t find what you&apos;re looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact" className="btn-primary">Contact Support</Link>
                <a href="mailto:support@spacenexus.us" className="btn-secondary">Email Us</a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
