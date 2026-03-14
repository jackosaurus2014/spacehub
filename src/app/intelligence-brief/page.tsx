'use client';

import { useState } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import SocialShare from '@/components/ui/SocialShare';
import ExportPDFButton from '@/components/ui/ExportPDFButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

interface BriefSection {
  category: string;
  icon: string;
  headline: string;
  details: string[];
}

interface WeeklyBrief {
  id: string;
  weekOf: string;
  dateRange: string;
  topStory: { headline: string; summary: string };
  sections: BriefSection[];
  keyTakeaway: string;
}

const BRIEFS: WeeklyBrief[] = [
  {
    id: 'feb-17-2026',
    weekOf: 'February 17, 2026',
    dateRange: 'Feb 17 - Feb 23',
    topStory: {
      headline: 'Starship Achieves Rapid Reusability Milestone',
      summary: 'SpaceX successfully launched and recovered a Starship booster within 48 hours of its previous flight, marking the fastest turnaround for the Super Heavy vehicle. The company says it expects to reach weekly cadence by Q3 2026.',
    },
    sections: [
      { category: 'Funding', icon: '💰', headline: '3 Notable Rounds This Week', details: ['Impulse Space raises $175M Series C for orbital transfer vehicles', 'Muon Space closes $45M Series A for climate monitoring satellites', 'Astroforge secures $25M for asteroid mining proof-of-concept mission'] },
      { category: 'Launches', icon: '🚀', headline: '5 Launches This Week (3 SpaceX, 1 China, 1 Rocket Lab)', details: ['SpaceX Starlink Group 12-4 from Cape Canaveral (60 sats)', 'SpaceX Starlink Group 12-5 from Vandenberg (60 sats)', 'SpaceX Transporter-13 rideshare (42 customer payloads)', 'CZ-2D from Jiuquan (YG-40 reconnaissance constellation)', 'Electron "Data With Destiny" from Mahia (HawkEye 360 cluster)'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'FCC Approves New Ka-Band Allocation', details: ['New 2GHz allocation in 27.5-28.35 GHz for NGSO systems', 'Expected to benefit Starlink Gen2 and Amazon Kuiper', 'SpaceX and SES filed comments supporting the expansion'] },
      { category: 'Personnel', icon: '👤', headline: '2 Executive Moves', details: ['Former Blue Origin VP of Mission Operations joins Axiom Space as SVP', 'L3Harris appoints new President of Space & Airborne Systems division'] },
      { category: 'Market', icon: '📊', headline: 'Space Sector Index Up 2.3%', details: ['Rocket Lab (RKLB) up 8.1% on strong Q4 earnings beat', 'Planet Labs (PL) up 4.2% on new defense contract', 'AST SpaceMobile (ASTS) down 3.5% on dilution concerns'] },
    ],
    keyTakeaway: 'Starship rapid reusability changes the economics of everything. At weekly cadence, cost-per-kg to LEO could drop below $100 -- disrupting the entire launch industry and enabling new business models in orbital manufacturing, debris removal, and mega-constellation deployment.',
  },
  {
    id: 'feb-10-2026',
    weekOf: 'February 10, 2026',
    dateRange: 'Feb 10 - Feb 16',
    topStory: {
      headline: 'Artemis II Crew Completes Final Training Milestone',
      summary: 'NASA announced the four-person Artemis II crew has completed their final integrated training exercise, including a full mission simulation. Launch remains on track for Q4 2026 from Kennedy Space Center.',
    },
    sections: [
      { category: 'Funding', icon: '💰', headline: 'Relativity Space Closes $200M Growth Round', details: ['Relativity Space raises $200M at $4.2B valuation for Terran R development', 'True Anomaly raises $100M Series B for space domain awareness', 'Inversion Space raises $20M Seed for Earth re-entry capsule delivery'] },
      { category: 'Launches', icon: '🚀', headline: '4 Launches (2 SpaceX, 1 ULA, 1 Arianespace)', details: ['SpaceX Starlink Group 12-3 from Cape Canaveral', 'SpaceX CRS-32 ISS resupply from Kennedy Space Center', 'ULA Vulcan Centaur carries NRO payload from Vandenberg', 'Ariane 6 commercial debut carries 2 GEO commsats from Kourou'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'EU Proposes Space Traffic Management Framework', details: ['European Commission publishes draft regulation for STM', 'Would require all EU-licensed satellites to carry tracking beacons', 'Industry reaction mixed -- concerns about cost burden on smallsat operators'] },
      { category: 'Personnel', icon: '👤', headline: 'New CEO at Aerojet Rocketdyne Division', details: ['L3Harris names Sarah Chen as new President of Aerojet Rocketdyne', 'Replaces interim leadership following 2023 acquisition integration'] },
      { category: 'Market', icon: '📊', headline: 'Satellite Stocks Rally on Earnings', details: ['SES up 6.3% after beating revenue estimates on O3b mPOWER demand', 'Iridium up 3.8% on IoT subscriber growth (+22% YoY)', 'Maxar Technologies flat after mixed guidance for 2026'] },
    ],
    keyTakeaway: 'The Ariane 6 commercial debut is a crucial milestone for European launch autonomy. With Russia no longer available and heavy reliance on SpaceX, Europe needs an independent path to orbit. Watch for pricing competitiveness vs. Falcon 9.',
  },
  {
    id: 'feb-03-2026',
    weekOf: 'February 3, 2026',
    dateRange: 'Feb 3 - Feb 9',
    topStory: {
      headline: 'Amazon Launches First Kuiper Production Satellites',
      summary: 'Amazon successfully deployed the first batch of 60 production Kuiper satellites aboard a ULA Atlas V, beginning the build-out of its 3,236-satellite broadband constellation. Service is expected to begin in late 2026.',
    },
    sections: [
      { category: 'Funding', icon: '💰', headline: '2 Seed Rounds in Debris Removal', details: ['ClearSpace raises $30M to fund ClearSpace-2 mission targeting defunct ESA satellite', 'Neumann Space raises $12M for in-orbit refueling and debris management'] },
      { category: 'Launches', icon: '🚀', headline: '6 Launches (4 SpaceX, 1 China, 1 India)', details: ['SpaceX Starlink (3 missions) from Cape Canaveral and Vandenberg', 'SpaceX launches Kuiper batch on contract from ULA', 'CZ-7A carries Tianzhou cargo to CSS from Wenchang', 'ISRO PSLV carries 7 international smallsats from Sriharikota'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'ITAR Reform Bill Introduced in Senate', details: ['Bipartisan bill would streamline ITAR licensing for allied nations', 'Would create "trusted partner" fast-track for Five Eyes + Japan + EU', 'Industry groups strongly support -- current process takes 6-12 months'] },
      { category: 'Personnel', icon: '👤', headline: 'SpaceX VP Moves to Blue Origin', details: ['SpaceX VP of Starlink Engineering departs for Blue Origin as SVP of Project Kuiper competitor response', 'Marks third senior SpaceX departure to Blue Origin in 2026'] },
      { category: 'Market', icon: '📊', headline: 'Launch Provider Stocks Mixed', details: ['Rocket Lab (RKLB) up 2.1% on Neutron development update', 'Virgin Orbit (VORB) delisted after Chapter 11 proceedings', 'Astra Space (ASTR) down 12% on going-concern warning'] },
    ],
    keyTakeaway: 'Amazon entering the LEO broadband race with production Kuiper satellites will intensify competition with Starlink. Watch for pricing wars and government contract battles, especially in underserved markets where both systems will compete for rural broadband subsidies.',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Funding: 'border-emerald-500/30 bg-emerald-500/5',
  Launches: 'border-white/10 bg-white/5',
  Regulatory: 'border-amber-500/30 bg-amber-500/5',
  Personnel: 'border-purple-500/30 bg-purple-500/5',
  Market: 'border-blue-500/30 bg-blue-500/5',
};

export default function IntelligenceBriefPage() {
  const [expandedBrief, setExpandedBrief] = useState<string>(BRIEFS[0].id);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <AnimatedPageHeader
              title="Weekly Intelligence Brief"
              subtitle="Curated weekly summary of the most important space industry developments. Funding rounds, launches, regulatory changes, executive moves, and market analysis."
              icon="📋"
              accentColor="cyan"
            />
          </div>
          <div className="flex items-center gap-2 mt-2 flex-shrink-0">
            <SocialShare
              title="Weekly Intelligence Brief - SpaceNexus"
              description="Curated weekly summary of the most important space industry developments."
            />
            <ExportPDFButton className="no-print" />
          </div>
        </div>

        {/* Subscribe CTA */}
        <ScrollReveal delay={0.1}>
          <div className="bg-gradient-to-r from-white/5 to-purple-500/10 border border-white/10 rounded-xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Get the brief in your inbox every Monday</h3>
              <p className="text-xs text-slate-400 mt-0.5">Join 2,000+ space professionals. Free weekly delivery.</p>
            </div>
            <Link href="/news" className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
              Subscribe Free
            </Link>
          </div>
        </ScrollReveal>

        {/* Brief Selector */}
        <ScrollReveal delay={0.15}>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {BRIEFS.map(brief => (
              <button key={brief.id} onClick={() => setExpandedBrief(brief.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${expandedBrief === brief.id ? 'bg-white/10 text-white/90 border border-white/10' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-slate-900'}`}>
                Week of {brief.weekOf.replace(', 2026', '')}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Brief Content */}
        {BRIEFS.filter(b => b.id === expandedBrief).map(brief => (
          <div key={brief.id}>
            {/* Header */}
            <ScrollReveal delay={0.2}>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Week of {brief.weekOf}</h2>
                <p className="text-sm text-slate-500">{brief.dateRange}</p>
              </div>
            </ScrollReveal>

            {/* Top Story */}
            <ScrollReveal delay={0.25}>
              <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.04] border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Top Story</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{brief.topStory.headline}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{brief.topStory.summary}</p>
              </div>
            </ScrollReveal>

            {/* Sections */}
            <div className="space-y-3 mb-6">
              {brief.sections.map((section, i) => {
                const sectionKey = `${brief.id}-${section.category}`;
                const isExpanded = expandedSections.has(sectionKey);
                return (
                  <ScrollReveal key={section.category} delay={0.3 + i * 0.05}>
                    <div className={`border rounded-xl overflow-hidden transition-colors ${CATEGORY_COLORS[section.category] || 'border-white/[0.06] bg-white/[0.03]'}`}>
                      <button onClick={() => toggleSection(sectionKey)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors">
                        <span className="text-xl">{section.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section.category}</span>
                          <p className="text-sm font-semibold text-white truncate">{section.headline}</p>
                        </div>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/5">
                          <ul className="space-y-2">
                            {section.details.map((detail, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-slate-500 mt-1 flex-shrink-0">-</span>
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            {/* Key Takeaway */}
            <ScrollReveal delay={0.55}>
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl p-5 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💡</span>
                  <span className="text-sm font-bold text-amber-300">Key Takeaway</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">{brief.keyTakeaway}</p>
              </div>
            </ScrollReveal>
          </div>
        ))}

        {/* Related Links */}
        <ScrollReveal delay={0.6}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'News Feed', href: '/news', icon: '📰' },
              { label: 'Funding Tracker', href: '/funding-tracker', icon: '💰' },
              { label: 'Regulatory Hub', href: '/compliance', icon: '⚖️' },
              { label: 'Executive Moves', href: '/executive-moves', icon: '👤' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="flex items-center gap-2 p-3 card hover:border-white/10 transition-colors text-sm text-white/70 hover:text-white">
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['intelligence-brief']} />
      </div>
    </div>
  );
}
