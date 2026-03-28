'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import FAQSchema from '@/components/seo/FAQSchema';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type MilestoneStatus = 'completed' | 'in-progress' | 'upcoming';

interface TimelineMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  status: MilestoneStatus;
}

interface KeyCompany {
  name: string;
  role: string;
  contractValue?: string;
  profileLink?: string;
  flag?: string;
}

interface Phase {
  number: number;
  title: string;
  budget: string;
  description: string;
  deliverables: string[];
}

interface InfraItem {
  name: string;
  icon: string;
  description: string;
}

interface RelatedArticle {
  href: string;
  title: string;
  excerpt: string;
  readingTime: string;
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const TIMELINE_MILESTONES: TimelineMilestone[] = [
  {
    id: 'artemis-ii',
    date: 'Apr 2026',
    title: 'Artemis II crewed lunar flyby',
    description: 'First crewed mission around the Moon since Apollo 17. Four astronauts will fly around the Moon aboard Orion and return to Earth.',
    status: 'in-progress',
  },
  {
    id: 'artemis-iii-test',
    date: 'Mid 2027',
    title: 'Artemis III Earth-orbit test (Starship HLS + Blue Moon)',
    description: 'Earth-orbit demonstrations of both SpaceX Starship Human Landing System and Blue Origin Blue Moon lander before crewed lunar landing attempts.',
    status: 'upcoming',
  },
  {
    id: 'artemis-iv',
    date: 'Early 2028',
    title: 'Artemis IV first crewed lunar landing',
    description: 'First crewed landing on the lunar surface since Apollo 17 in 1972, using the SpaceX Starship HLS near the lunar south pole.',
    status: 'upcoming',
  },
  {
    id: 'reactor-freedom',
    date: 'Late 2028',
    title: 'Space Reactor 1 Freedom to Mars',
    description: 'NASA\'s fission surface power system, developed under Project Ignition, will fly a demonstration reactor to Mars orbit.',
    status: 'upcoming',
  },
  {
    id: 'jaxa-rover',
    date: 'FY 2032',
    title: 'JAXA pressurized rover delivered',
    description: 'Japan\'s pressurized lunar rover delivered to the Moon, enabling long-range exploration beyond the immediate landing zone.',
    status: 'upcoming',
  },
  {
    id: 'blue-habitat',
    date: 'FY 2033',
    title: 'Blue Origin habitat delivered',
    description: 'Blue Origin delivers a large-scale habitation module to the lunar surface, establishing the first permanent living quarters on the Moon.',
    status: 'upcoming',
  },
  {
    id: 'permanent-presence',
    date: '2033',
    title: 'Permanent human presence on Moon',
    description: 'All infrastructure elements combine to enable continuous human habitation at the lunar south pole base.',
    status: 'upcoming',
  },
];

const KEY_COMPANIES: KeyCompany[] = [
  { name: 'SpaceX', role: 'Starship HLS (crew + cargo lander)', contractValue: '$2.9B+', profileLink: '/company-profiles/spacex' },
  { name: 'Blue Origin', role: 'Blue Moon lander (habitat delivery FY2033)', contractValue: '$3.4B', profileLink: '/company-profiles/blue-origin' },
  { name: 'Northrop Grumman', role: 'HALO module (Gateway habitat)', contractValue: '$935M', profileLink: '/company-profiles/northrop-grumman' },
  { name: 'Lockheed Martin', role: 'Orion spacecraft', contractValue: '$9.3B (cumulative)', profileLink: '/company-profiles/lockheed-martin' },
  { name: 'JAXA', role: 'Pressurized rover (FY2032)', flag: 'JP' },
  { name: 'ESA', role: 'I-Hab module & Orion service module', flag: 'EU' },
  { name: 'ASI (Italy)', role: 'HALO & surface contributions', flag: 'IT' },
  { name: 'CSA (Canada)', role: 'Canadarm3 & surface systems', flag: 'CA' },
];

const PHASES: Phase[] = [
  {
    number: 1,
    title: 'Build, Test, Learn',
    budget: '~$10B',
    description: 'Expand Commercial Lunar Payload Services (CLPS), fly technology demonstrations, deploy rovers, and deliver scientific instruments to the lunar surface.',
    deliverables: [
      'Expanded CLPS deliveries to lunar surface',
      'Technology demos for power, communications, ISRU',
      'Robotic rovers and science instruments',
      'Artemis II & III crew flights',
    ],
  },
  {
    number: 2,
    title: 'Early Infrastructure',
    budget: '~$5B',
    description: 'Build out semi-habitable areas at the lunar south pole. Deliver JAXA pressurized rover. Establish consistent crew rotation and surface operations.',
    deliverables: [
      'Semi-habitable surface areas established',
      'JAXA pressurized rover (FY2032)',
      'Consistent crew rotation schedule',
      'Nuclear & solar power systems operational',
      'Lunar cellular network activated',
    ],
  },
  {
    number: 3,
    title: 'Long-Term Presence',
    budget: '~$5B',
    description: 'Deploy larger habitats including Blue Origin\'s habitat module. Achieve permanent settlement with continuous human presence on the Moon by 2033.',
    deliverables: [
      'Blue Origin habitat module (FY2033)',
      'Permanent crew quarters',
      'Full ISRU operations (water, oxygen, propellant)',
      'Lunar GPS constellation',
      'Self-sustaining base operations',
    ],
  },
];

const INFRASTRUCTURE: InfraItem[] = [
  { name: 'Nuclear & Solar Power', icon: '⚡', description: 'Fission surface power reactor + solar arrays for continuous energy supply' },
  { name: 'Pressurized Rovers', icon: '🚗', description: 'JAXA-built pressurized rover for long-range exploration (100+ km)' },
  { name: 'Unpressurized Rovers', icon: '🏎️', description: 'Multiple robotic & crew rovers for surface mobility' },
  { name: 'Lunar Cellular Network', icon: '📶', description: 'Nokia-developed 4G/LTE network for base communications' },
  { name: 'Lunar GPS', icon: '📍', description: 'Satellite constellation for precision navigation on the Moon' },
  { name: 'Satellite Constellations', icon: '🛰️', description: 'Relay satellites in lunar orbit for continuous Earth-Moon comms' },
  { name: 'HALO Module', icon: '🏠', description: 'Northrop Grumman habitat module for Gateway station' },
  { name: 'I-Hab Module', icon: '🏗️', description: 'ESA-built international habitation module for Gateway' },
  { name: 'Blue Origin Habitat', icon: '🏘️', description: 'Large-scale surface habitat for permanent crew quarters' },
  { name: 'ISRU Systems', icon: '⛏️', description: 'Water ice extraction, oxygen production, and regolith processing' },
];

const RELATED_ARTICLES: RelatedArticle[] = [
  {
    href: '/blog/how-to-watch-artemis-ii-launch-complete-guide',
    title: 'How to Watch the Artemis II Launch: Complete Guide',
    excerpt: 'Everything you need to know about watching humanity\'s return to the Moon, including viewing locations, live streams, and key milestones.',
    readingTime: '8 min read',
  },
  {
    href: '/blog/nasa-20-billion-moon-base-everything-you-need-to-know',
    title: 'NASA\'s $20 Billion Moon Base: Everything You Need to Know',
    excerpt: 'A comprehensive breakdown of Project Ignition, NASA\'s plan to build a permanent lunar base by 2033 with international partners.',
    readingTime: '12 min read',
  },
  {
    href: '/blog/nasa-moon-base-commercial-space-implications',
    title: 'NASA Moon Base: Commercial Space Implications',
    excerpt: 'How Project Ignition will reshape the commercial space industry, from launch services to lunar resource extraction.',
    readingTime: '10 min read',
  },
  {
    href: '/blog/nasa-artemis-program-complete-guide-2026',
    title: 'NASA Artemis Program: Complete Guide 2026',
    excerpt: 'The definitive guide to NASA\'s Artemis program, including mission schedules, crew assignments, and the path to sustained lunar presence.',
    readingTime: '15 min read',
  },
];

// ────────────────────────────────────────
// Status Styles
// ────────────────────────────────────────

const STATUS_STYLES: Record<MilestoneStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  'completed': { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30', dot: 'bg-green-400' },
  'in-progress': { label: 'In Progress', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', dot: 'bg-yellow-400 animate-pulse' },
  'upcoming': { label: 'Upcoming', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30', dot: 'bg-blue-400' },
};

const ARTEMIS_BADGE_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  'Ready': { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30' },
  '2027': { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30' },
  '2028': { color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
};

// ────────────────────────────────────────
// Countdown Hook
// ────────────────────────────────────────

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    }
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function CountdownDisplay() {
  // Artemis II target: April 1, 2026
  const countdown = useCountdown(new Date('2026-04-01T00:00:00Z'));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {[
        { value: countdown.days, label: 'Days' },
        { value: countdown.hours, label: 'Hrs' },
        { value: countdown.minutes, label: 'Min' },
        { value: countdown.seconds, label: 'Sec' },
      ].map((unit) => (
        <div key={unit.label} className="flex flex-col items-center">
          <span className="text-2xl md:text-3xl font-mono font-bold text-white tabular-nums">
            {String(unit.value).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-star-400 uppercase tracking-widest">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

function HeroStats() {
  const stats = [
    { label: 'Total Budget', value: '$20B', icon: '💰', sub: 'Over program lifetime' },
    { label: 'Timeline', value: '2026-2033', icon: '📅', sub: '7-year build plan' },
    { label: 'Phases', value: '3', icon: '🎯', sub: 'Build, Infra, Permanent' },
    { label: 'Partners', value: '5+', icon: '🌐', sub: 'Nations contributing' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card p-5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <div className="text-star-300 text-xs uppercase tracking-widest">{stat.label}</div>
              <div className="text-white font-bold text-xl">{stat.value}</div>
              <div className="text-star-400 text-xs">{stat.sub}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveStatusSection() {
  const badges = [
    { mission: 'Artemis II', status: 'Ready' },
    { mission: 'Artemis III', status: '2027' },
    { mission: 'Artemis IV', status: '2028' },
  ];

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-lg">📡</span>
        Live Status
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Phase */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-sm text-star-300 uppercase tracking-wider">Current Phase</span>
            </div>
            <h3 className="text-lg font-semibold text-white">Phase 1: Build, Test, Learn</h3>
            <p className="text-star-400 text-sm mt-1">Expanding CLPS deliveries, conducting technology demonstrations, and preparing for first crewed lunar landing.</p>
          </div>

          {/* Phase Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-star-400 mb-1">
              <span>Phase 1 Progress</span>
              <span>~15%</span>
            </div>
            <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000" style={{ width: '15%' }} />
            </div>
          </div>

          {/* Quick Status Badges */}
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => {
              const style = ARTEMIS_BADGE_STYLES[b.status] || ARTEMIS_BADGE_STYLES['2028'];
              return (
                <span key={b.mission} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${style.color} ${style.bg} border ${style.border}`}>
                  {b.mission}: {b.status}
                </span>
              );
            })}
          </div>
        </div>

        {/* Next Milestone Countdown */}
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-5">
          <div className="text-sm text-star-300 uppercase tracking-wider mb-2">Next Milestone</div>
          <h3 className="text-lg font-semibold text-white mb-1">Artemis II Launch</h3>
          <p className="text-star-400 text-sm mb-4">Crewed lunar flyby — April 2026</p>
          <CountdownDisplay />
        </div>
      </div>
    </div>
  );
}

function ProgramTimeline() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-lg">📋</span>
        Program Timeline
      </h2>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 md:left-6 top-0 bottom-0 w-px bg-white/[0.08]" />

        <div className="space-y-6">
          {TIMELINE_MILESTONES.map((milestone) => {
            const style = STATUS_STYLES[milestone.status];
            return (
              <div key={milestone.id} className="relative flex gap-4 md:gap-6">
                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 w-8 md:w-12 flex justify-center pt-1">
                  <div className={`w-3 h-3 rounded-full ${style.dot} ring-4 ring-[#09090b]`} />
                </div>

                {/* Content */}
                <div className={`flex-1 rounded-lg border ${style.border} ${style.bg} p-4`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-star-300">{milestone.date}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.color} ${style.bg} border ${style.border}`}>
                      {style.label}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-sm md:text-base">{milestone.title}</h3>
                  <p className="text-star-400 text-xs md:text-sm mt-1">{milestone.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KeyCompaniesSection() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-lg">🏢</span>
        Key Companies &amp; Partners
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KEY_COMPANIES.map((company) => {
          const inner = (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-4 h-full hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-white font-semibold group-hover:text-teal-300 transition-colors">
                  {company.flag && <span className="mr-1.5">{getFlagEmoji(company.flag)}</span>}
                  {company.name}
                </h3>
                {company.profileLink && (
                  <svg className="w-4 h-4 text-star-400 group-hover:text-teal-400 transition-colors flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                )}
              </div>
              <p className="text-star-400 text-sm mb-2">{company.role}</p>
              {company.contractValue && (
                <span className="inline-block text-xs font-medium text-green-400 bg-green-900/20 border border-green-500/30 px-2 py-0.5 rounded-full">
                  {company.contractValue}
                </span>
              )}
            </div>
          );

          return company.profileLink ? (
            <Link key={company.name} href={company.profileLink}>
              {inner}
            </Link>
          ) : (
            <div key={company.name}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

function PhasesSection() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-lg">🎯</span>
        Three Phases of Project Ignition
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PHASES.map((phase) => (
          <div key={phase.number} className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                {phase.number}
              </span>
              <div>
                <h3 className="text-white font-semibold">{phase.title}</h3>
                <span className="text-xs text-green-400 font-medium">{phase.budget}</span>
              </div>
            </div>
            <p className="text-star-400 text-sm mb-4 flex-1">{phase.description}</p>
            <div className="space-y-1.5">
              {phase.deliverables.map((d) => (
                <div key={d} className="flex items-start gap-2 text-xs text-star-300">
                  <span className="text-teal-400 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfrastructureSection() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-lg">🏗️</span>
        Planned Base Infrastructure
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {INFRASTRUCTURE.map((item) => (
          <div key={item.name} className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-4 hover:bg-white/[0.06] transition-colors">
            <div className="text-2xl mb-2">{item.icon}</div>
            <h3 className="text-white font-medium text-sm mb-1">{item.name}</h3>
            <p className="text-star-400 text-xs">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedArticlesSection() {
  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-lg">📰</span>
        Related Articles
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RELATED_ARTICLES.map((article) => (
          <Link key={article.href} href={article.href} className="group">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-4 h-full hover:bg-white/[0.06] hover:border-white/10 transition-all duration-200">
              <h3 className="text-white font-semibold text-sm group-hover:text-indigo-300 transition-colors mb-2">
                {article.title}
              </h3>
              <p className="text-star-400 text-xs mb-3 line-clamp-2">{article.excerpt}</p>
              <span className="text-xs text-star-300 font-medium">{article.readingTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NewsletterCTA() {
  return (
    <div className="card p-6 mb-8 bg-gradient-to-br from-teal-900/20 via-transparent to-blue-900/20 border-teal-500/20">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-2">Get Ignition Updates</h2>
        <p className="text-star-400 text-sm mb-4">
          Track every contract, milestone, and company involved in Project Ignition.
        </p>
        <Link
          href="/newsletter"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          Subscribe to Newsletter
        </Link>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Utility
// ────────────────────────────────────────

function getFlagEmoji(countryCode: string): string {
  const flags: Record<string, string> = {
    JP: '\u{1F1EF}\u{1F1F5}',
    EU: '\u{1F1EA}\u{1F1FA}',
    IT: '\u{1F1EE}\u{1F1F9}',
    CA: '\u{1F1E8}\u{1F1E6}',
  };
  return flags[countryCode] || '';
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function IgnitionTrackerPage() {
  const relatedModules = PAGE_RELATIONS['ignition'] || [];

  return (
    <div className="min-h-screen relative z-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <Image
            src="/art/hero-mission-planning.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>

        <div className="container mx-auto px-4 pt-12 pb-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Program Tracker
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-300 border border-green-500/30">
                Live
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
              Ignition Tracker
            </h1>
            <p className="text-lg md:text-xl text-star-300">
              Tracking NASA&apos;s $20 Billion Lunar Base Program
            </p>
            <p className="text-sm text-star-400 mt-2 max-w-2xl">
              Project Ignition is NASA&apos;s plan to build a permanent human presence on the Moon by 2033.
              Track milestones, contracts, companies, and infrastructure in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-16">
        {/* Hero Stats */}
        <HeroStats />

        {/* Live Status */}
        <LiveStatusSection />

        {/* Program Timeline */}
        <ProgramTimeline />

        {/* Key Companies */}
        <KeyCompaniesSection />

        {/* Three Phases */}
        <PhasesSection />

        {/* Infrastructure */}
        <InfrastructureSection />

        {/* Related Articles */}
        <RelatedArticlesSection />

        {/* Newsletter CTA */}
        <NewsletterCTA />

        {/* FAQ Section for Rich Snippets */}
        <FAQSchema items={[
          { question: 'What is NASA Project Ignition?', answer: 'Project Ignition is NASA\'s $20 billion initiative to build a permanent human base at the Moon\'s south pole. Announced in March 2026, it replaces the Lunar Gateway with a surface-first approach, using commercial partners like SpaceX, Blue Origin, and international agencies to establish permanent lunar habitation by 2033.' },
          { question: 'How much does Project Ignition cost?', answer: 'Project Ignition has a total budget of $20 billion over seven fiscal years (FY2027-2033). Approximately $10 billion funds Phase 1 (robotic testing and technology validation), with the remainder funding habitat construction and permanent infrastructure. This is in addition to existing Artemis program costs.' },
          { question: 'When will the Moon base be ready?', answer: 'NASA targets a permanent human presence on the Moon by 2033. Phase 1 (Build, Test, Learn) runs FY2027-2030 with robotic precursor missions. Phase 2 (Early Infrastructure) targets FY2030-2032 with semi-habitable areas and JAXA\'s pressurized rover. Phase 3 (Long-Term Presence) delivers Blue Origin\'s habitat by FY2033.' },
          { question: 'Which companies are involved in Project Ignition?', answer: 'Key companies include SpaceX (Starship HLS crew and cargo lander, $2.9B+), Blue Origin (Blue Moon lander and surface habitat, $3.4B), Northrop Grumman (HALO module, $935M), and Lockheed Martin (Orion spacecraft, $9.3B cumulative). International partners include JAXA (pressurized rover), ESA (I-Hab module), ASI (Italy), and CSA (Canada).' },
          { question: 'What happened to the Lunar Gateway?', answer: 'NASA paused the Lunar Gateway — a planned orbiting station around the Moon — to redirect resources to surface infrastructure under Project Ignition. Gateway\'s HALO and I-Hab modules will be repurposed for surface deployment rather than assembled in lunar orbit, simplifying the architecture and reducing per-mission costs.' },
        ]} />
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-lg">&#x2753;</span>
            Frequently Asked Questions
          </h2>
          <div className="space-y-5">
            {[
              { q: 'What is NASA Project Ignition?', a: 'Project Ignition is NASA\'s $20 billion initiative to build a permanent human base at the Moon\'s south pole. Announced in March 2026, it replaces the Lunar Gateway with a surface-first approach, using commercial partners and international agencies to establish permanent lunar habitation by 2033.' },
              { q: 'How much does Project Ignition cost?', a: '$20 billion over seven fiscal years (FY2027-2033). Approximately $10 billion funds Phase 1 (robotic testing), with the remainder funding habitat construction and permanent infrastructure.' },
              { q: 'When will the Moon base be ready?', a: 'NASA targets permanent human presence by 2033. Phase 1 runs FY2027-2030, Phase 2 targets FY2030-2032, and Phase 3 delivers the Blue Origin habitat by FY2033.' },
              { q: 'Which companies are involved in Project Ignition?', a: 'SpaceX (Starship HLS), Blue Origin (Blue Moon lander + habitat), Northrop Grumman (HALO module), Lockheed Martin (Orion), plus international partners JAXA, ESA, ASI, and CSA.' },
              { q: 'What happened to the Lunar Gateway?', a: 'NASA paused Gateway to redirect resources to surface infrastructure. Gateway\'s HALO and I-Hab modules will be repurposed for surface deployment rather than assembled in lunar orbit.' },
            ].map((faq) => (
              <div key={faq.q} className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-4">
                <h3 className="text-white font-semibold text-sm mb-2">{faq.q}</h3>
                <p className="text-star-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Modules */}
        {relatedModules.length > 0 && (
          <RelatedModules modules={relatedModules} title="Related Intelligence" />
        )}
      </div>
    </div>
  );
}
