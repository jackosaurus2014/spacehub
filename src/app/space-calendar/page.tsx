'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ShareButton from '@/components/ui/ShareButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventCategory = 'launch' | 'conference' | 'policy' | 'milestone' | 'business';

interface CalendarEvent {
  date: string; // display string e.g. "Mar 20"
  sortDate: string; // YYYY-MM-DD for sorting
  title: string;
  category: EventCategory;
  description: string;
  location?: string;
  highlight?: boolean;
}

interface MonthData {
  month: string;
  monthNum: number; // 1-12
  year: number;
  events: CalendarEvent[];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const CALENDAR_DATA: MonthData[] = [
  {
    month: 'January',
    monthNum: 1,
    year: 2026,
    events: [
      { date: 'Jan 13-15', sortDate: '2026-01-13', title: 'AIAA SciTech Forum', category: 'conference', description: 'Premier aerospace research conference', location: 'San Diego, CA' },
      { date: 'Jan TBD', sortDate: '2026-01-15', title: 'Starship V3 Test Flight #2', category: 'launch', description: 'SpaceX continues rapid Starship iteration' },
      { date: 'Jan 27', sortDate: '2026-01-27', title: 'FCC Space Bureau Q1 Meeting', category: 'policy', description: 'Spectrum allocation and debris rule updates' },
    ],
  },
  {
    month: 'February',
    monthNum: 2,
    year: 2026,
    events: [
      { date: 'Feb 2-5', sortDate: '2026-02-02', title: 'SmallSat Symposium', category: 'conference', description: 'Small satellite industry gathering', location: 'Mountain View, CA' },
      { date: 'Feb 10', sortDate: '2026-02-10', title: 'ESA Ministerial Review', category: 'policy', description: 'Mid-term review of ESA program commitments' },
      { date: 'Feb TBD', sortDate: '2026-02-15', title: 'Blue Origin New Glenn Flight 2', category: 'launch', description: 'Second orbital flight of New Glenn heavy-lift vehicle' },
      { date: 'Feb 23-25', sortDate: '2026-02-23', title: 'Global Space Conference', category: 'conference', description: 'Abu Dhabi space industry summit', location: 'Abu Dhabi, UAE' },
    ],
  },
  {
    month: 'March',
    monthNum: 3,
    year: 2026,
    events: [
      { date: 'Mar 9-12', sortDate: '2026-03-09', title: 'Satellite Innovation', category: 'conference', description: 'Satellite technology conference', location: 'London, UK' },
      { date: 'Mar 20', sortDate: '2026-03-20', title: 'Artemis II Rollout to Pad', category: 'milestone', description: 'SLS/Orion stack rolls out to LC-39B for final preparations', location: 'Kennedy Space Center, FL', highlight: true },
      { date: 'Mar 23-26', sortDate: '2026-03-23', title: 'SATELLITE 2026', category: 'conference', description: 'The largest satellite industry conference in the world, with 15,000+ attendees', location: 'Washington, DC', highlight: true },
      { date: 'Mar 30-31', sortDate: '2026-03-30', title: 'Space Symposium Preview', category: 'conference', description: 'Pre-symposium workshops and briefings', location: 'Colorado Springs, CO' },
    ],
  },
  {
    month: 'April',
    monthNum: 4,
    year: 2026,
    events: [
      { date: 'Apr ~1', sortDate: '2026-04-01', title: 'Artemis II Launch', category: 'launch', description: 'First crewed Artemis mission: 4 astronauts on a lunar flyby. First humans beyond LEO since 1972.', location: 'Kennedy Space Center, FL', highlight: true },
      { date: 'Apr 6-9', sortDate: '2026-04-06', title: 'Space Symposium', category: 'conference', description: '41st annual Space Symposium hosted by Space Foundation', location: 'Colorado Springs, CO', highlight: true },
      { date: 'Apr TBD', sortDate: '2026-04-15', title: 'Starship V3 Operational Flight', category: 'launch', description: 'SpaceX targets first Starship V3 operational Starlink deployment' },
      { date: 'Apr 20-22', sortDate: '2026-04-20', title: 'COPUOS Legal Subcommittee', category: 'policy', description: 'UN Committee on Peaceful Uses of Outer Space legal session', location: 'Vienna, Austria' },
    ],
  },
  {
    month: 'May',
    monthNum: 5,
    year: 2026,
    events: [
      { date: 'May 4-8', sortDate: '2026-05-04', title: 'GEOINT Symposium', category: 'conference', description: 'Geospatial intelligence conference with space focus', location: 'Denver, CO' },
      { date: 'May TBD', sortDate: '2026-05-10', title: 'Rocket Lab Neutron First Flight', category: 'launch', description: 'Maiden orbital flight of Neutron medium-lift vehicle', highlight: true },
      { date: 'May 18-22', sortDate: '2026-05-18', title: 'ISS Research Conference', category: 'conference', description: 'Annual ISS research and development conference', location: 'Boston, MA' },
      { date: 'May TBD', sortDate: '2026-05-25', title: 'Kuiper Operational Tranche', category: 'launch', description: 'Amazon Kuiper first operational satellite batch deployment' },
    ],
  },
  {
    month: 'June',
    monthNum: 6,
    year: 2026,
    events: [
      { date: 'Jun 8-10', sortDate: '2026-06-08', title: 'Reuters Space & Satellites', category: 'conference', description: 'Reuters flagship space industry and investment summit', location: 'London, UK', highlight: true },
      { date: 'Jun TBD', sortDate: '2026-06-15', title: 'SpaceX IPO (Expected)', category: 'business', description: 'Anticipated SpaceX initial public offering, potentially the largest tech IPO in years at $350B+ valuation', highlight: true },
      { date: 'Jun 15-19', sortDate: '2026-06-15', title: 'COPUOS Session', category: 'policy', description: '69th session of the UN Committee on Peaceful Uses of Outer Space', location: 'Vienna, Austria' },
      { date: 'Jun 22-26', sortDate: '2026-06-22', title: 'Paris Air Show 2026', category: 'conference', description: 'Biennial aerospace show (if scheduled; alternates with Farnborough)', location: 'Le Bourget, France' },
    ],
  },
  {
    month: 'July',
    monthNum: 7,
    year: 2026,
    events: [
      { date: 'Jul 14-18', sortDate: '2026-07-14', title: 'Farnborough Airshow', category: 'conference', description: 'Major aerospace trade show with growing space pavilion', location: 'Farnborough, UK' },
      { date: 'Jul TBD', sortDate: '2026-07-20', title: 'Lunar Gateway Module Launch', category: 'launch', description: 'PPE/HALO module launch for International Lunar Gateway', highlight: true },
      { date: 'Jul 28-30', sortDate: '2026-07-28', title: 'NewSpace Europe', category: 'conference', description: 'European new space industry conference', location: 'Luxembourg' },
    ],
  },
  {
    month: 'August',
    monthNum: 8,
    year: 2026,
    events: [
      { date: 'Aug 3-7', sortDate: '2026-08-03', title: 'SmallSat Conference', category: 'conference', description: 'Annual small satellite conference at Utah State', location: 'Logan, UT' },
      { date: 'Aug TBD', sortDate: '2026-08-15', title: 'AST SpaceMobile D2D Launch', category: 'launch', description: 'Commercial direct-to-device constellation expansion' },
      { date: 'Aug 24-26', sortDate: '2026-08-24', title: 'Space Tech Expo', category: 'conference', description: 'Space technology exhibition and conference', location: 'Long Beach, CA' },
    ],
  },
  {
    month: 'September',
    monthNum: 9,
    year: 2026,
    events: [
      { date: 'Sep 8-10', sortDate: '2026-09-08', title: 'World Satellite Business Week', category: 'conference', description: 'Premier satellite business networking event', location: 'Paris, France', highlight: true },
      { date: 'Sep 14-18', sortDate: '2026-09-14', title: 'AMOS Conference', category: 'conference', description: 'Advanced Maui Optical and Space Surveillance conference', location: 'Maui, HI' },
      { date: 'Sep TBD', sortDate: '2026-09-20', title: 'Vulcan Centaur Cert. Mission', category: 'launch', description: 'ULA Vulcan Centaur national security certification mission' },
    ],
  },
  {
    month: 'October',
    monthNum: 10,
    year: 2026,
    events: [
      { date: 'Oct 5-9', sortDate: '2026-10-05', title: 'IAC 2026', category: 'conference', description: '77th International Astronautical Congress, the world\'s premier space conference', location: 'Milan, Italy', highlight: true },
      { date: 'Oct TBD', sortDate: '2026-10-15', title: 'Ariane 6 Heavy Mission', category: 'launch', description: 'Ariane 6 first heavy-lift configuration mission' },
      { date: 'Oct 19-21', sortDate: '2026-10-19', title: 'Silicon Valley Space Week', category: 'conference', description: 'Space startup and investor networking week', location: 'San Jose, CA' },
    ],
  },
  {
    month: 'November',
    monthNum: 11,
    year: 2026,
    events: [
      { date: 'Nov 3-5', sortDate: '2026-11-03', title: 'Space Tech Expo Europe', category: 'conference', description: 'European space technology exhibition', location: 'Bremen, Germany' },
      { date: 'Nov TBD', sortDate: '2026-11-10', title: 'Dream Chaser Cargo Mission', category: 'launch', description: 'Sierra Space Dream Chaser ISS cargo delivery', highlight: true },
      { date: 'Nov 16-18', sortDate: '2026-11-16', title: 'SpaceCom', category: 'conference', description: 'Space commerce conference and exposition', location: 'Orlando, FL' },
    ],
  },
  {
    month: 'December',
    monthNum: 12,
    year: 2026,
    events: [
      { date: 'Dec 1-3', sortDate: '2026-12-01', title: 'Space Policy Summit', category: 'conference', description: 'Year-end space policy review and outlook', location: 'Washington, DC' },
      { date: 'Dec TBD', sortDate: '2026-12-10', title: 'WRC-27 Preparatory Conference', category: 'policy', description: 'Final regional preparatory conference for WRC-27 spectrum decisions' },
      { date: 'Dec 15', sortDate: '2026-12-15', title: 'SpaceNexus Industry Scorecard Q4', category: 'milestone', description: 'Q4 2026 Space Industry Scorecard published' },
    ],
  },
];

const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; bgColor: string }> = {
  launch: { label: 'Launch', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30' },
  conference: { label: 'Conference', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20 border-cyan-500/30' },
  policy: { label: 'Policy', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-500/30' },
  milestone: { label: 'Milestone', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20 border-emerald-500/30' },
  business: { label: 'Business', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/30' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryBadge(category: EventCategory) {
  const config = CATEGORY_CONFIG[category];
  return (
    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
}

function isCurrentOrFutureMonth(monthNum: number, year: number): boolean {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  if (year > currentYear) return true;
  if (year === currentYear) return monthNum >= currentMonth;
  return false;
}

function isCurrentMonth(monthNum: number, year: number): boolean {
  const now = new Date();
  return monthNum === now.getMonth() + 1 && year === now.getFullYear();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HighlightCards() {
  const highlights = CALENDAR_DATA.flatMap((m) =>
    m.events.filter((e) => e.highlight).map((e) => ({ ...e, monthLabel: m.month }))
  ).slice(0, 6);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">Top Events of 2026</h2>
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.06}>
        {highlights.map((event) => (
          <StaggerItem key={event.title}>
            <div className="card p-5 border-l-4 border-l-cyan-500 hover:border-l-cyan-400 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                {getCategoryBadge(event.category)}
                <span className="text-xs text-slate-500">{event.date}</span>
              </div>
              <h3 className="text-sm font-semibold text-slate-100 mb-1">{event.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
              {event.location && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </p>
              )}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

function MonthCard({ data }: { data: MonthData }) {
  const isCurrent = isCurrentMonth(data.monthNum, data.year);
  const isFuture = isCurrentOrFutureMonth(data.monthNum, data.year);

  return (
    <div className={`card p-5 ${isCurrent ? 'ring-1 ring-cyan-500/40' : ''} ${!isFuture ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className={`text-base font-semibold ${isCurrent ? 'text-cyan-400' : 'text-slate-100'}`}>
            {data.month}
          </h3>
          {isCurrent && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium">
              Current
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{data.events.length} events</span>
      </div>

      <div className="space-y-3">
        {data.events.map((event) => (
          <div
            key={event.title}
            className={`flex items-start gap-3 p-2.5 rounded-lg ${event.highlight ? 'bg-white/[0.04]' : ''}`}
          >
            <div className="w-16 shrink-0 text-xs text-slate-500 font-mono pt-0.5">
              {event.date.split(' ').slice(1).join(' ')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={`text-xs font-medium ${event.highlight ? 'text-white' : 'text-white/80'}`}>
                  {event.title}
                </span>
                {getCategoryBadge(event.category)}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{event.description}</p>
              {event.location && (
                <p className="text-[10px] text-slate-500 mt-1">{event.location}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((key) => {
        const config = CATEGORY_CONFIG[key];
        return (
          <span key={key} className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${config.bgColor} ${config.color}`}>
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

function QuickStats() {
  const totalEvents = CALENDAR_DATA.reduce((sum, m) => sum + m.events.length, 0);
  const launches = CALENDAR_DATA.flatMap((m) => m.events).filter((e) => e.category === 'launch').length;
  const conferences = CALENDAR_DATA.flatMap((m) => m.events).filter((e) => e.category === 'conference').length;
  const highlights = CALENDAR_DATA.flatMap((m) => m.events).filter((e) => e.highlight).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[
        { label: 'Total Events', value: totalEvents.toString(), icon: '📅' },
        { label: 'Key Launches', value: launches.toString(), icon: '🚀' },
        { label: 'Conferences', value: conferences.toString(), icon: '🎤' },
        { label: 'Must-Watch', value: highlights.toString(), icon: '⭐' },
      ].map((stat) => (
        <div key={stat.label} className="card p-4 text-center">
          <div className="text-xl mb-1">{stat.icon}</div>
          <div className="text-2xl font-bold text-white">{stat.value}</div>
          <div className="text-xs text-slate-400">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

function EventJsonLd() {
  const keyEvents = [
    {
      name: 'Artemis II Rollout to Pad',
      startDate: '2026-03-20',
      endDate: '2026-03-20',
      location: 'Kennedy Space Center, FL',
      description: 'SLS/Orion stack rolls out to LC-39B for final preparations for the first crewed Artemis mission.',
    },
    {
      name: 'SATELLITE 2026',
      startDate: '2026-03-23',
      endDate: '2026-03-26',
      location: 'Washington, DC',
      description: 'The largest satellite industry conference in the world, with 15,000+ attendees from across the global space ecosystem.',
    },
    {
      name: 'Artemis II Launch',
      startDate: '2026-04-01',
      endDate: '2026-04-01',
      location: 'Kennedy Space Center, FL',
      description: 'First crewed Artemis mission: 4 astronauts on a lunar flyby. First humans beyond LEO since 1972.',
    },
    {
      name: 'Space Symposium',
      startDate: '2026-04-06',
      endDate: '2026-04-09',
      location: 'Colorado Springs, CO',
      description: '41st annual Space Symposium hosted by Space Foundation.',
    },
    {
      name: 'IAC 2026',
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      location: 'Milan, Italy',
      description: '77th International Astronautical Congress, the world\'s premier space conference.',
    },
  ];

  const jsonLd = keyEvents.map((event) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    description: event.description,
    location: {
      '@type': 'Place',
      name: event.location,
      address: event.location,
    },
    organizer: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
    },
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: 'https://spacenexus.us/space-calendar',
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}

export default function SpaceCalendarPage() {
  const [filter, setFilter] = useState<EventCategory | 'all'>('all');

  const filteredData = useMemo(() => {
    if (filter === 'all') return CALENDAR_DATA;
    return CALENDAR_DATA.map((m) => ({
      ...m,
      events: m.events.filter((e) => e.category === filter),
    })).filter((m) => m.events.length > 0);
  }, [filter]);

  return (
    <div className="min-h-screen py-8">
      <EventJsonLd />
      <div className="container mx-auto px-4 max-w-7xl">

        <AnimatedPageHeader
          title="Space Industry Calendar"
          subtitle="Month-by-month guide to the most important space industry events, launches, conferences, and milestones for 2026. Never miss a critical date."
          icon={<span>📅</span>}
          accentColor="cyan"
        />

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Link
            href="/space-events"
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            View full event directory (55+ events)
          </Link>
          <ShareButton
            title="Space Industry Calendar 2026 - SpaceNexus"
            description="Month-by-month visual calendar of the most important space industry events for 2026."
          />
        </div>

        {/* Quick Stats */}
        <ScrollReveal>
          <QuickStats />
        </ScrollReveal>

        {/* Highlight Cards */}
        <ScrollReveal delay={0.05}>
          <HighlightCards />
        </ScrollReveal>

        {/* Filter Bar */}
        <ScrollReveal delay={0.1}>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === 'all'
                  ? 'bg-white/[0.1] border-white/20 text-white'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10'
              }`}
            >
              All
            </button>
            {(Object.keys(CATEGORY_CONFIG) as EventCategory[]).map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === key
                    ? 'bg-white/[0.1] border-white/20 text-white'
                    : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/10'
                }`}
              >
                {CATEGORY_CONFIG[key].label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Category Legend */}
        <CategoryLegend />

        {/* Month-by-Month Calendar */}
        <ScrollReveal delay={0.15}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Month-by-Month Calendar</h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" staggerDelay={0.04}>
              {filteredData.map((monthData) => (
                <StaggerItem key={`${monthData.month}-${monthData.year}`}>
                  <MonthCard data={monthData} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>

        {/* Save to Calendar CTA */}
        <ScrollReveal delay={0.2}>
          <div className="card p-6 mb-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Stay on top of every event</h2>
            <p className="text-sm text-slate-400 mb-4">
              Visit our full event directory to download .ics files, add events to Google Calendar, and set reminders.
            </p>
            <Link
              href="/space-events"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              Browse All 55+ Events
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <ScrollReveal delay={0.25}>
          <div className="mb-8">
            <RelatedModules modules={PAGE_RELATIONS['space-calendar']} />
          </div>
        </ScrollReveal>

        {/* Explore More */}
        <ScrollReveal delay={0.3}>
          <section className="mt-16 border-t border-white/[0.06] pt-8">
            <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/space-events" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Event Directory</h3>
                <p className="text-slate-400 text-sm mt-1">Full event directory with filtering, costs, and calendar export.</p>
              </a>
              <a href="/conferences" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Conferences</h3>
                <p className="text-slate-400 text-sm mt-1">Space industry conferences with detailed information.</p>
              </a>
              <a href="/industry-scorecard" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Industry Scorecard</h3>
                <p className="text-slate-400 text-sm mt-1">Quarterly grades on launches, investment, workforce, and more.</p>
              </a>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
}
