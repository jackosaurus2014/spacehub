'use client';

import React, { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import EventSchema from '@/components/seo/EventSchema';
import ShareButton from '@/components/ui/ShareButton';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import EmptyState from '@/components/ui/EmptyState';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type EventCategory = 'Military/Defense' | 'Commercial' | 'Academic' | 'Startup' | 'Investment';
type EventRegion = 'US' | 'Europe' | 'Asia' | 'Virtual' | 'Middle East';
type CostBracket = 'Free' | '<$500' | '$500-$2000' | '$2000+';
type SortField = 'date' | 'attendance' | 'cost';
type ViewMode = 'grid' | 'calendar';

interface ConferenceEvent {
  id: string;
  name: string;
  dates: string;
  month: number; // 1-12
  location: string;
  region: EventRegion;
  website: string;
  categories: EventCategory[];
  attendance: number;
  costLow: number;
  costHigh: number;
  costDisplay: string;
  topics: string[];
  description: string;
  recurring: boolean;
}

// ────────────────────────────────────────
// Conference Data — 28 Real Events
// ────────────────────────────────────────

const CONFERENCES: ConferenceEvent[] = [
  {
    id: 'ces-space-tech',
    name: 'CES Space Tech Pavilion',
    dates: 'Jan 7-10, 2026',
    month: 1,
    location: 'Las Vegas, NV, USA',
    region: 'US',
    website: 'www.ces.tech',
    categories: ['Commercial', 'Startup'],
    attendance: 180000,
    costLow: 300,
    costHigh: 1800,
    costDisplay: '$300 - $1,800',
    topics: ['Space Technology', 'Satellite IoT', 'Earth Observation', 'Autonomous Systems', 'Space Robotics'],
    description:
      'The world\'s largest consumer electronics show features a growing Space Tech pavilion showcasing satellite communications, Earth observation startups, and commercial space ventures.',
    recurring: true,
  },
  {
    id: 'aiaa-scitech',
    name: 'AIAA SciTech Forum',
    dates: 'Jan 19-23, 2026',
    month: 1,
    location: 'Orlando, FL, USA',
    region: 'US',
    website: 'www.aiaa.org/scitech',
    categories: ['Academic', 'Military/Defense'],
    attendance: 5500,
    costLow: 700,
    costHigh: 2200,
    costDisplay: '$700 - $2,200',
    topics: ['Aerospace Research', 'Propulsion', 'Aerodynamics', 'Structures & Materials', 'Guidance & Control'],
    description:
      'The premier forum for aerospace research and development, covering fundamental and applied science across all aerospace disciplines with over 3,500 technical papers presented annually.',
    recurring: true,
  },
  {
    id: 'smallsat-symposium',
    name: 'SmallSat Symposium',
    dates: 'Feb 3-5, 2026',
    month: 2,
    location: 'Mountain View, CA, USA',
    region: 'US',
    website: 'www.smallsatshow.com',
    categories: ['Commercial', 'Startup'],
    attendance: 2500,
    costLow: 800,
    costHigh: 1900,
    costDisplay: '$800 - $1,900',
    topics: ['SmallSat Technology', 'Launch Services', 'Constellation Design', 'Ground Systems', 'Regulatory'],
    description:
      'Focused on the rapidly growing small satellite industry, bringing together manufacturers, launch providers, and operators to discuss emerging technologies and market trends.',
    recurring: true,
  },
  {
    id: 'satellite-conference',
    name: 'SATELLITE Conference & Exhibition',
    dates: 'Mar 16-19, 2026',
    month: 3,
    location: 'Washington, DC, USA',
    region: 'US',
    website: 'www.satshow.com',
    categories: ['Commercial', 'Military/Defense'],
    attendance: 13000,
    costLow: 0,
    costHigh: 3500,
    costDisplay: 'Free (Exhibit) - $3,500',
    topics: ['Satellite Communications', 'Telecom', '5G/6G Integration', 'Broadcasting', 'Government Services'],
    description:
      'The world\'s largest satellite technology event, connecting the entire satellite ecosystem from operators and manufacturers to government agencies and telecom companies.',
    recurring: true,
  },
  {
    id: 'space-symposium',
    name: 'Space Symposium',
    dates: 'Apr 6-9, 2026',
    month: 4,
    location: 'Colorado Springs, CO, USA',
    region: 'US',
    website: 'www.spacesymposium.org',
    categories: ['Military/Defense', 'Commercial'],
    attendance: 15000,
    costLow: 1000,
    costHigh: 4500,
    costDisplay: '$1,000 - $4,500',
    topics: ['National Security Space', 'Commercial Space', 'Space Policy', 'International Cooperation', 'Workforce'],
    description:
      'Hosted by the Space Foundation, this premier event brings together military, intelligence, civil, and commercial space leaders for high-level discussions on the future of space.',
    recurring: true,
  },
  {
    id: 'space-tech-expo-usa',
    name: 'Space Tech Expo USA',
    dates: 'May 19-21, 2026',
    month: 5,
    location: 'Long Beach, CA, USA',
    region: 'US',
    website: 'www.spacetechexpo.com',
    categories: ['Commercial', 'Academic'],
    attendance: 5000,
    costLow: 0,
    costHigh: 1500,
    costDisplay: 'Free (Exhibit) - $1,500',
    topics: ['Space Manufacturing', 'Testing & Quality', 'Materials & Components', 'Propulsion', 'Thermal Management'],
    description:
      'The go-to event for the space technology manufacturing supply chain, featuring the latest in spacecraft components, testing equipment, and manufacturing processes.',
    recurring: true,
  },
  {
    id: 'ila-berlin',
    name: 'ILA Berlin Air Show',
    dates: 'Jun 4-8, 2026',
    month: 6,
    location: 'Berlin, Germany',
    region: 'Europe',
    website: 'www.ila-berlin.de',
    categories: ['Commercial', 'Military/Defense'],
    attendance: 72000,
    costLow: 25,
    costHigh: 500,
    costDisplay: '$25 - $500',
    topics: ['Aerospace & Defense', 'Space Pavilion', 'Urban Air Mobility', 'Sustainability', 'MRO'],
    description:
      'One of the world\'s oldest aerospace trade shows featuring a dedicated space pavilion with ESA, DLR, and European space industry participation.',
    recurring: true,
  },
  {
    id: 'global-space-exploration',
    name: 'Global Space Exploration Conference (GLEX)',
    dates: 'Jun 16-20, 2026',
    month: 6,
    location: 'Milan, Italy',
    region: 'Europe',
    website: 'www.iafastro.org',
    categories: ['Academic', 'Commercial'],
    attendance: 3000,
    costLow: 500,
    costHigh: 1500,
    costDisplay: '$500 - $1,500',
    topics: ['Human Exploration', 'Robotic Missions', 'Moon & Mars', 'International Cooperation', 'Sustainability'],
    description:
      'Organized by the International Astronautical Federation, GLEX brings together space agencies and industry leaders to discuss the future roadmap of space exploration.',
    recurring: true,
  },
  {
    id: 'paris-air-show',
    name: 'Paris Air Show (Le Bourget)',
    dates: 'Jun 16-22, 2025 (next: Jun 2027)',
    month: 6,
    location: 'Paris, France',
    region: 'Europe',
    website: 'www.siae.fr',
    categories: ['Commercial', 'Military/Defense'],
    attendance: 316000,
    costLow: 30,
    costHigh: 600,
    costDisplay: '$30 - $600',
    topics: ['Aerospace & Defense', 'Space Launch', 'Satellite Systems', 'Aviation', 'Urban Air Mobility'],
    description:
      'The world\'s oldest and largest aerospace exhibition, alternating biennially with Farnborough. Features major space announcements, launch vehicle displays, and satellite contracts.',
    recurring: true,
  },
  {
    id: 'farnborough',
    name: 'Farnborough International Airshow',
    dates: 'Jul 20-24, 2026',
    month: 7,
    location: 'Farnborough, UK',
    region: 'Europe',
    website: 'www.farnboroughairshow.com',
    categories: ['Commercial', 'Military/Defense'],
    attendance: 80000,
    costLow: 50,
    costHigh: 800,
    costDisplay: '$50 - $800',
    topics: ['Aerospace', 'Defense', 'Space Technology', 'Sustainability', 'Innovation Zone'],
    description:
      'One of the world\'s largest aerospace events alternating with Paris Air Show. Increasingly features dedicated space content including launch providers and satellite operators.',
    recurring: true,
  },
  {
    id: 'geoint-symposium',
    name: 'GEOINT Symposium',
    dates: 'Jun 1-4, 2026',
    month: 6,
    location: 'San Diego, CA, USA',
    region: 'US',
    website: 'www.usgif.org',
    categories: ['Military/Defense', 'Commercial'],
    attendance: 4500,
    costLow: 800,
    costHigh: 2500,
    costDisplay: '$800 - $2,500',
    topics: ['Geospatial Intelligence', 'Remote Sensing', 'AI/ML for Earth Observation', 'National Security', 'Mapping'],
    description:
      'The nation\'s largest intelligence community conference focused on geospatial intelligence, featuring satellite imagery providers, analytics companies, and defense agencies.',
    recurring: true,
  },
  {
    id: 'smallsat-conference',
    name: 'SmallSat Conference',
    dates: 'Aug 1-6, 2026',
    month: 8,
    location: 'Logan, UT, USA',
    region: 'US',
    website: 'smallsat.org',
    categories: ['Academic', 'Commercial', 'Startup'],
    attendance: 3000,
    costLow: 200,
    costHigh: 800,
    costDisplay: '$200 - $800',
    topics: ['Small Satellites', 'CubeSats', 'University Programs', 'Mission Design', 'Launch Opportunities'],
    description:
      'Hosted by Utah State University, this is the premier technical conference for small satellite missions, bringing together academia, government, and industry for knowledge exchange.',
    recurring: true,
  },
  {
    id: 'responsive-space',
    name: 'AIAA/USU Conference on Responsive Space',
    dates: 'Aug 10-13, 2026',
    month: 8,
    location: 'Los Angeles, CA, USA',
    region: 'US',
    website: 'www.aiaa.org',
    categories: ['Military/Defense', 'Academic'],
    attendance: 1200,
    costLow: 500,
    costHigh: 1200,
    costDisplay: '$500 - $1,200',
    topics: ['Responsive Launch', 'Rapid Reconstitution', 'Tactical Space', 'Resilient Architectures', 'Space Domain Awareness'],
    description:
      'Focused on building resilient, responsive, and rapidly deployable space capabilities for national security applications.',
    recurring: true,
  },
  {
    id: 'world-satellite-business-week',
    name: 'World Satellite Business Week',
    dates: 'Sep 14-18, 2026',
    month: 9,
    location: 'Paris, France',
    region: 'Europe',
    website: 'www.satellite-business.com',
    categories: ['Commercial', 'Investment'],
    attendance: 3500,
    costLow: 3000,
    costHigh: 6000,
    costDisplay: '$3,000 - $6,000',
    topics: ['Satellite Business', 'Connectivity', 'Investment', 'Spectrum', 'Emerging Markets'],
    description:
      'Organized by Euroconsult, this exclusive executive event brings together satellite industry CEOs, investors, and policymakers for strategic discussions on the global satellite market.',
    recurring: true,
  },
  {
    id: 'space-tech-expo-europe',
    name: 'Space Tech Expo Europe',
    dates: 'Nov 17-19, 2026',
    month: 11,
    location: 'Bremen, Germany',
    region: 'Europe',
    website: 'www.spacetechexpo.eu',
    categories: ['Commercial', 'Academic'],
    attendance: 4000,
    costLow: 0,
    costHigh: 1200,
    costDisplay: 'Free (Exhibit) - $1,200',
    topics: ['European Space Industry', 'Manufacturing', 'Testing', 'Subsystems', 'NewSpace Europe'],
    description:
      'Europe\'s premier B2B space technology event for the manufacturing and engineering supply chain serving the space industry.',
    recurring: true,
  },
  {
    id: 'iac',
    name: 'International Astronautical Congress (IAC)',
    dates: 'Oct 12-16, 2026',
    month: 10,
    location: 'Milan, Italy',
    region: 'Europe',
    website: 'www.iafastro.org',
    categories: ['Academic', 'Commercial', 'Military/Defense'],
    attendance: 8000,
    costLow: 400,
    costHigh: 2000,
    costDisplay: '$400 - $2,000',
    topics: ['Global Space Policy', 'Exploration', 'Space Science', 'Applications', 'Emerging Countries'],
    description:
      'The world\'s premier gathering of the global space community, organized by the International Astronautical Federation. Location rotates annually across continents.',
    recurring: true,
  },
  {
    id: 'euroconsult',
    name: 'Euroconsult World Space Week',
    dates: 'Sep 22-24, 2026',
    month: 9,
    location: 'Paris, France',
    region: 'Europe',
    website: 'www.euroconsult-ec.com',
    categories: ['Commercial', 'Investment'],
    attendance: 2000,
    costLow: 2500,
    costHigh: 5000,
    costDisplay: '$2,500 - $5,000',
    topics: ['Market Analysis', 'Industry Forecasts', 'Government Programs', 'Commercial Trends', 'Data Analytics'],
    description:
      'The leading industry analysis event featuring Euroconsult\'s annual market forecasts, attracting senior executives and policy makers from across the global space sector.',
    recurring: true,
  },
  {
    id: 'spacecom',
    name: 'SpaceCom',
    dates: 'Nov 18-19, 2026',
    month: 11,
    location: 'Orlando, FL, USA',
    region: 'US',
    website: 'www.spacecomexpo.com',
    categories: ['Commercial', 'Startup'],
    attendance: 3000,
    costLow: 500,
    costHigh: 2000,
    costDisplay: '$500 - $2,000',
    topics: ['Commercial Space', 'Space-enabled Industries', 'Energy', 'Agriculture', 'Maritime', 'Entrepreneurship'],
    description:
      'Connects the commercial space industry with terrestrial enterprises, showing how space technology and data create value for Earth-based industries.',
    recurring: true,
  },
  {
    id: 'newspace-conference',
    name: 'NewSpace Conference',
    dates: 'Jun 8-9, 2026',
    month: 6,
    location: 'Seattle, WA, USA',
    region: 'US',
    website: 'newspace.spacefrontier.org',
    categories: ['Startup', 'Investment', 'Commercial'],
    attendance: 1500,
    costLow: 400,
    costHigh: 1200,
    costDisplay: '$400 - $1,200',
    topics: ['Space Startups', 'Venture Capital', 'Entrepreneurship', 'Disruptive Technology', 'New Business Models'],
    description:
      'Organized by the Space Frontier Foundation, this event focuses on entrepreneurial space companies, venture capital, and the commercial transformation of the space industry.',
    recurring: true,
  },
  {
    id: 'space-investment-quarterly',
    name: 'Space Investment Summit',
    dates: 'Mar 24-25, 2026',
    month: 3,
    location: 'Virtual / New York, NY',
    region: 'Virtual',
    website: 'www.spaceinvestmentsummit.com',
    categories: ['Investment', 'Startup'],
    attendance: 800,
    costLow: 0,
    costHigh: 500,
    costDisplay: 'Free - $500',
    topics: ['Space Investing', 'SPACs', 'Venture Capital', 'Public Markets', 'Due Diligence', 'Exit Strategies'],
    description:
      'A premier gathering for space industry investors, fund managers, and entrepreneurs seeking capital, featuring pitch sessions and market trend analysis.',
    recurring: true,
  },
  {
    id: 'ascend',
    name: 'AIAA ASCEND',
    dates: 'Oct 26-28, 2026',
    month: 10,
    location: 'Las Vegas, NV, USA',
    region: 'US',
    website: 'www.aiaa.org/ascend',
    categories: ['Commercial', 'Academic'],
    attendance: 2000,
    costLow: 600,
    costHigh: 1800,
    costDisplay: '$600 - $1,800',
    topics: ['In-Space Economy', 'Cislunar', 'Space Sustainability', 'Policy', 'Workforce Development'],
    description:
      'AIAA\'s event dedicated to accelerating the space economy, covering topics from in-space manufacturing to cislunar infrastructure and space sustainability.',
    recurring: true,
  },
  {
    id: 'defense-space-summit',
    name: 'Defense & Space Summit',
    dates: 'May 5-7, 2026',
    month: 5,
    location: 'Huntsville, AL, USA',
    region: 'US',
    website: 'www.smi-online.co.uk',
    categories: ['Military/Defense'],
    attendance: 1800,
    costLow: 1500,
    costHigh: 3500,
    costDisplay: '$1,500 - $3,500',
    topics: ['Space Force', 'Missile Defense', 'Space Domain Awareness', 'Hypersonics', 'Satellite Resilience'],
    description:
      'Senior-level defense conference focused on military space operations, missile defense, and the evolving space warfighting domain.',
    recurring: true,
  },
  {
    id: 'dubai-airshow',
    name: 'Dubai Airshow',
    dates: 'Nov 16-20, 2025 (next: Nov 2027)',
    month: 11,
    location: 'Dubai, UAE',
    region: 'Middle East',
    website: 'www.dubaiairshow.aero',
    categories: ['Commercial', 'Military/Defense'],
    attendance: 95000,
    costLow: 50,
    costHigh: 400,
    costDisplay: '$50 - $400',
    topics: ['Aerospace', 'Space', 'Defense', 'Advanced Air Mobility', 'Sustainability', 'MRO'],
    description:
      'One of the fastest-growing aerospace shows with increasing space content, featuring Middle Eastern space agencies and international participants.',
    recurring: true,
  },
  {
    id: 'asia-pacific-satellite',
    name: 'Asia-Pacific Satellite Communications Council (APSCC)',
    dates: 'Oct 20-22, 2026',
    month: 10,
    location: 'Tokyo, Japan',
    region: 'Asia',
    website: 'www.apscc.or.kr',
    categories: ['Commercial'],
    attendance: 1500,
    costLow: 500,
    costHigh: 1500,
    costDisplay: '$500 - $1,500',
    topics: ['APAC Satellite Market', 'Broadband', 'Maritime', 'Aviation Connectivity', 'Regional Development'],
    description:
      'The leading satellite communications conference for the Asia-Pacific region, covering broadband, broadcasting, and connectivity solutions.',
    recurring: true,
  },
  {
    id: 'space-operations',
    name: 'SpaceOps Conference',
    dates: 'Apr 21-25, 2026',
    month: 4,
    location: 'Montreal, Canada',
    region: 'US',
    website: 'www.spaceops.org',
    categories: ['Academic', 'Commercial'],
    attendance: 1200,
    costLow: 400,
    costHigh: 1200,
    costDisplay: '$400 - $1,200',
    topics: ['Mission Operations', 'Ground Systems', 'Autonomous Operations', 'Human Spaceflight Ops', 'Data Management'],
    description:
      'Organized by AIAA and international partners, SpaceOps focuses on the operational aspects of space missions from launch through end-of-life.',
    recurring: true,
  },
  {
    id: 'isdc',
    name: 'International Space Development Conference (ISDC)',
    dates: 'May 22-25, 2026',
    month: 5,
    location: 'Los Angeles, CA, USA',
    region: 'US',
    website: 'isdc.nss.org',
    categories: ['Academic', 'Startup'],
    attendance: 1000,
    costLow: 200,
    costHigh: 600,
    costDisplay: '$200 - $600',
    topics: ['Space Settlement', 'Space Solar Power', 'Asteroid Mining', 'Lunar Development', 'Space Advocacy'],
    description:
      'Hosted by the National Space Society, ISDC brings together space advocates, researchers, and entrepreneurs focused on opening the space frontier for human settlement.',
    recurring: true,
  },
  {
    id: 'indo-pacific-space',
    name: 'Indo-Pacific Space & Earth Conference',
    dates: 'Sep 8-10, 2026',
    month: 9,
    location: 'Sydney, Australia',
    region: 'Asia',
    website: 'www.space-earth.com.au',
    categories: ['Commercial', 'Military/Defense'],
    attendance: 2000,
    costLow: 600,
    costHigh: 2000,
    costDisplay: '$600 - $2,000',
    topics: ['Earth Observation', 'Defense Space', 'AUKUS', 'Southern Hemisphere', 'Climate Monitoring'],
    description:
      'Australia\'s premier space event covering Earth observation, defense applications, and the growing Indo-Pacific space ecosystem with AUKUS collaboration themes.',
    recurring: true,
  },
  {
    id: 'global-milsatcom',
    name: 'Global MilSatCom',
    dates: 'Nov 3-5, 2026',
    month: 11,
    location: 'London, UK',
    region: 'Europe',
    website: 'www.smionline.co.uk',
    categories: ['Military/Defense'],
    attendance: 600,
    costLow: 2000,
    costHigh: 4500,
    costDisplay: '$2,000 - $4,500',
    topics: ['Military Satellite Comms', 'Resilient SATCOM', 'Contested Space', 'Allied Interoperability', 'Cyber Defense'],
    description:
      'The world\'s leading conference on military satellite communications, focusing on protected tactical communications and space domain resilience.',
    recurring: true,
  },
];

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const ALL_CATEGORIES: EventCategory[] = ['Military/Defense', 'Commercial', 'Academic', 'Startup', 'Investment'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const ALL_REGIONS: EventRegion[] = ['US', 'Europe', 'Asia', 'Virtual', 'Middle East'];
const COST_BRACKETS: CostBracket[] = ['Free', '<$500', '$500-$2000', '$2000+'];

const CATEGORY_COLORS: Record<EventCategory, string> = {
  'Military/Defense': 'bg-red-500/20 text-red-300 border-red-500/30',
  Commercial: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Academic: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Startup: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Investment: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const CATEGORY_DOT_COLORS: Record<EventCategory, string> = {
  'Military/Defense': 'bg-red-400',
  Commercial: 'bg-cyan-400',
  Academic: 'bg-purple-400',
  Startup: 'bg-emerald-400',
  Investment: 'bg-amber-400',
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function matchCostBracket(event: ConferenceEvent, bracket: CostBracket): boolean {
  switch (bracket) {
    case 'Free':
      return event.costLow === 0;
    case '<$500':
      return event.costLow < 500;
    case '$500-$2000':
      return event.costLow <= 2000 && event.costHigh >= 500;
    case '$2000+':
      return event.costHigh >= 2000;
    default:
      return true;
  }
}

function formatAttendance(n: number): string {
  if (n >= 100000) return `${Math.round(n / 1000)}K+`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`;
  return `${n}+`;
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function ConferencesPage() {
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'All'>('All');
  const [monthFilter, setMonthFilter] = useState<number | 0>(0); // 0 = All
  const [regionFilter, setRegionFilter] = useState<EventRegion | 'All'>('All');
  const [costFilter, setCostFilter] = useState<CostBracket | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Sort & View
  const [sortField, setSortField] = useState<SortField>('date');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filtered + sorted events
  const filteredEvents = useMemo(() => {
    let events = [...CONFERENCES];

    // Category filter
    if (categoryFilter !== 'All') {
      events = events.filter((e) => e.categories.includes(categoryFilter));
    }

    // Month filter
    if (monthFilter !== 0) {
      events = events.filter((e) => e.month === monthFilter);
    }

    // Region filter
    if (regionFilter !== 'All') {
      events = events.filter((e) => e.region === regionFilter);
    }

    // Cost filter
    if (costFilter !== 'All') {
      events = events.filter((e) => matchCostBracket(e, costFilter));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.topics.some((t) => t.toLowerCase().includes(q)) ||
          e.description.toLowerCase().includes(q)
      );
    }

    // Sort
    events.sort((a, b) => {
      switch (sortField) {
        case 'date':
          return a.month - b.month;
        case 'attendance':
          return b.attendance - a.attendance;
        case 'cost':
          return a.costLow - b.costLow;
        default:
          return 0;
      }
    });

    return events;
  }, [categoryFilter, monthFilter, regionFilter, costFilter, searchQuery, sortField]);

  // Stats
  const stats = useMemo(() => {
    const total = CONFERENCES.length;
    const avgCost = Math.round(
      CONFERENCES.reduce((sum, e) => sum + (e.costLow + e.costHigh) / 2, 0) / total
    );
    const totalAttendance = CONFERENCES.reduce((sum, e) => sum + e.attendance, 0);

    // Top locations
    const locationCounts: Record<string, number> = {};
    CONFERENCES.forEach((e) => {
      const country = e.region;
      locationCounts[country] = (locationCounts[country] || 0) + 1;
    });
    const topRegion = Object.entries(locationCounts).sort(([, a], [, b]) => b - a)[0];

    return { total, avgCost, totalAttendance, topRegion };
  }, []);

  // Events grouped by month for calendar view
  const eventsByMonth = useMemo(() => {
    const grouped: Record<number, ConferenceEvent[]> = {};
    filteredEvents.forEach((e) => {
      if (!grouped[e.month]) grouped[e.month] = [];
      grouped[e.month].push(e);
    });
    return grouped;
  }, [filteredEvents]);

  const activeFilterCount = [
    categoryFilter !== 'All' ? 1 : 0,
    monthFilter !== 0 ? 1 : 0,
    regionFilter !== 'All' ? 1 : 0,
    costFilter !== 'All' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setCategoryFilter('All');
    setMonthFilter(0);
    setRegionFilter('All');
    setCostFilter('All');
    setSearchQuery('');
  };

  // Build Event JSON-LD structured data for SEO
  const eventSchemaData = CONFERENCES.map((event) => {
    // Parse dates like "Jan 7-10, 2026" or "Apr 6-9, 2026"
    const dateMatch = event.dates.match(/(\w+)\s+(\d+)-(\d+),\s*(\d{4})/);
    const monthMap: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };

    let startDate: string | undefined;
    let endDate: string | undefined;
    if (dateMatch) {
      const mm = monthMap[dateMatch[1]] || String(event.month).padStart(2, '0');
      const year = dateMatch[4];
      startDate = `${year}-${mm}-${dateMatch[2].padStart(2, '0')}`;
      endDate = `${year}-${mm}-${dateMatch[3].padStart(2, '0')}`;
    }

    const isVirtual = event.region === 'Virtual';

    return {
      '@type': 'Event',
      name: event.name,
      description: event.description,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: isVirtual
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
      location: isVirtual
        ? { '@type': 'VirtualLocation', url: `https://${event.website}` }
        : { '@type': 'Place', name: event.location, address: event.location },
      url: `https://${event.website}`,
      offers: {
        '@type': 'AggregateOffer',
        lowPrice: String(event.costLow),
        highPrice: String(event.costHigh),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    };
  });

  const conferencesSchema = {
    '@context': 'https://schema.org',
    '@graph': eventSchemaData,
  };

  return (
    <div className="min-h-screen py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(conferencesSchema).replace(/</g, '\\u003c') }}
      />
      {CONFERENCES.map((event) => {
        const dateMatch = event.dates.match(/(\w+)\s+(\d+)-(\d+),\s*(\d{4})/);
        const monthMap: Record<string, string> = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
        };
        let startDate: string | undefined;
        let endDate: string | undefined;
        if (dateMatch) {
          const mm = monthMap[dateMatch[1]] || String(event.month).padStart(2, '0');
          startDate = `${dateMatch[4]}-${mm}-${dateMatch[2].padStart(2, '0')}`;
          endDate = `${dateMatch[4]}-${mm}-${dateMatch[3].padStart(2, '0')}`;
        }
        return (
          <EventSchema
            key={event.id}
            name={event.name}
            description={event.description}
            startDate={startDate || event.dates}
            endDate={endDate}
            location={event.region !== 'Virtual' ? event.location : undefined}
            url={`https://${event.website}`}
            organizer={event.name}
          />
        );
      })}
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Resources', href: '/resources' },
          { name: 'Conferences' },
        ]} />
        <Breadcrumbs items={[
          { label: 'Resources', href: '/resources' },
          { label: 'Conferences' },
        ]} />

        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Conferences & Events"
          subtitle="Discover upcoming aerospace conferences, trade shows, symposia, and networking events worldwide. Filter by category, region, cost, and month."
          accentColor="purple"
        />

        <div className="flex justify-end mb-4">
          <ShareButton
            title="Space Industry Conferences & Events - SpaceNexus"
            description="Discover upcoming aerospace conferences, trade shows, symposia, and networking events worldwide."
          />
        </div>

        {/* Stats Row */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StaggerItem><div className="card p-5 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.total}</div>
            <div className="text-sm text-slate-400 mt-1">Events Listed</div>
          </div></StaggerItem>
          <StaggerItem><div className="card p-5 text-center">
            <div className="text-3xl font-bold text-cyan-400">
              {formatAttendance(stats.totalAttendance)}
            </div>
            <div className="text-sm text-slate-400 mt-1">Combined Attendance</div>
          </div></StaggerItem>
          <StaggerItem><div className="card p-5 text-center">
            <div className="text-3xl font-bold text-emerald-400">
              ${stats.avgCost.toLocaleString()}
            </div>
            <div className="text-sm text-slate-400 mt-1">Avg Registration Cost</div>
          </div></StaggerItem>
          <StaggerItem><div className="card p-5 text-center">
            <div className="text-3xl font-bold text-amber-400">
              {stats.topRegion?.[0] || '-'}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Top Region ({stats.topRegion?.[1] || 0} events)
            </div>
          </div></StaggerItem>
        </StaggerContainer>

        {/* Filter & Controls Panel */}
        <ScrollReveal delay={0.1}>
        <div className="card p-4 mb-6">
          {/* Search + View Toggle Row */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
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
              <input
                type="search"
                placeholder="Search events, topics, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-slate-800/70 rounded-lg p-1 border border-slate-700/50 self-start">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Calendar
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as EventCategory | 'All')}
              className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="All">All Categories</option>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Month */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(Number(e.target.value))}
              className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value={0}>All Months</option>
              {MONTH_FULL.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>

            {/* Region */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as EventRegion | 'All')}
              className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="All">All Regions</option>
              {ALL_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {/* Cost */}
            <select
              value={costFilter}
              onChange={(e) => setCostFilter(e.target.value as CostBracket | 'All')}
              className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="All">All Costs</option>
              {COST_BRACKETS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="date">Sort by Date</option>
              <option value="attendance">Sort by Attendance</option>
              <option value="cost">Sort by Cost (Low)</option>
            </select>
          </div>

          {/* Active Filters */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/30">
              <span className="text-xs text-slate-500">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-sm text-slate-300">
                {filteredEvents.length} of {CONFERENCES.length} events shown
              </span>
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
        </ScrollReveal>

        {/* No results */}
        {filteredEvents.length === 0 && (
          <EmptyState
            icon={<span className="text-4xl">📅</span>}
            title="No events found"
            description="Try adjusting your filters or search query to find matching conferences."
            action={
              <button
                onClick={clearFilters}
                className="text-sm text-purple-400 hover:text-purple-300 underline underline-offset-2"
              >
                Reset all filters
              </button>
            }
          />
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredEvents.length > 0 && (
          <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          </ScrollReveal>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && filteredEvents.length > 0 && (
          <div className="space-y-6">
            {Array.from({ length: 12 }, (_, i) => i + 1)
              .filter((month) => eventsByMonth[month]?.length)
              .map((month) => (
                <div key={month}>
                  {/* Month Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-600/30 border border-purple-500/40 rounded-lg px-4 py-2">
                      <span className="text-lg font-bold text-purple-300">
                        {MONTH_FULL[month - 1]}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-500/40 to-transparent" />
                    <span className="text-sm text-slate-500">
                      {eventsByMonth[month].length} event
                      {eventsByMonth[month].length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Timeline Events */}
                  <div className="relative pl-8 space-y-4">
                    {/* Timeline Line */}
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 via-purple-500/20 to-transparent" />

                    {eventsByMonth[month].map((event) => (
                      <div key={event.id} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-5 top-5 w-3 h-3 rounded-full bg-purple-500 border-2 border-slate-900 z-10" />
                        <CalendarEventCard event={event} />
                      </div>
                    ))}

        <RelatedModules modules={PAGE_RELATIONS['conferences']} />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Category Legend */}
        <div className="card p-5 mt-10">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Category Legend
          </h3>
          <div className="flex flex-wrap gap-4">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'All' : cat)}
                className={`flex items-center gap-2 text-sm transition-opacity ${
                  categoryFilter !== 'All' && categoryFilter !== cat ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${CATEGORY_DOT_COLORS[cat]}`} />
                <span className="text-slate-300">{cat}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Event Card (Grid View)
// ────────────────────────────────────────

function EventCard({ event }: { event: ConferenceEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex flex-wrap gap-1.5">
          {event.categories.map((cat) => (
            <span
              key={cat}
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}
            >
              {cat}
            </span>
          ))}
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap font-mono">
          {MONTH_NAMES[event.month - 1]}
        </span>
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-slate-100 mb-2 leading-tight">
        {event.name}
      </h3>

      {/* Details */}
      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{event.dates}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>{formatAttendance(event.attendance)} attendees</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{event.costDisplay}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <span className="text-slate-500 text-xs truncate">{event.website}</span>
        </div>
      </div>

      {/* Description (collapsible) */}
      <p
        className={`text-sm text-slate-400 leading-relaxed mb-3 ${
          expanded ? '' : 'line-clamp-2'
        }`}
      >
        {event.description}
      </p>
      {event.description.length > 120 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-purple-400 hover:text-purple-300 mb-3 self-start transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Topics */}
      <div className="mt-auto pt-3 border-t border-slate-700/30">
        <div className="flex flex-wrap gap-1.5">
          {event.topics.slice(0, expanded ? event.topics.length : 3).map((topic) => (
            <span
              key={topic}
              className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40"
            >
              {topic}
            </span>
          ))}
          {!expanded && event.topics.length > 3 && (
            <span className="text-xs text-slate-500 px-2 py-0.5">
              +{event.topics.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Calendar Event Card
// ────────────────────────────────────────

function CalendarEventCard({ event }: { event: ConferenceEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Left: Date badge */}
        <div className="flex-shrink-0 md:w-28 text-center">
          <div className="text-sm font-medium text-purple-400">{event.dates.split(',')[0]}</div>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-base font-semibold text-slate-100 leading-tight">
              {event.name}
            </h4>
            <div className="flex gap-1 flex-shrink-0">
              {event.categories.slice(0, 2).map((cat) => (
                <span
                  key={cat}
                  className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mb-2">
            <span>{event.location}</span>
            <span className="text-slate-600">|</span>
            <span>{formatAttendance(event.attendance)} attendees</span>
            <span className="text-slate-600">|</span>
            <span>{event.costDisplay}</span>
          </div>

          {expanded && (
            <>
              <p className="text-sm text-slate-400 leading-relaxed mb-2">
                {event.description}
              </p>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <span>Website:</span>
                <span className="text-slate-400">{event.website}</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {event.topics.slice(0, expanded ? event.topics.length : 3).map((topic) => (
                <span
                  key={topic}
                  className="text-xs text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/40"
                >
                  {topic}
                </span>
              ))}
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto text-xs text-purple-400 hover:text-purple-300 flex-shrink-0 transition-colors"
            >
              {expanded ? 'Less' : 'More'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
