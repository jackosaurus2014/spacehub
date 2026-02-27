'use client';

import React, { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ---------- Types ----------

type NewsletterCategory = 'Business' | 'Technical' | 'Policy' | 'Investment' | 'Defense' | 'Science';
type CostTier = 'Free' | 'Freemium' | 'Paid';

interface Newsletter {
  name: string;
  frequency: string;
  cost: CostTier;
  focusArea: NewsletterCategory[];
  subscriberEstimate: string;
  description: string;
  url: string;
}

interface Podcast {
  name: string;
  host: string;
  frequency: string;
  description: string;
  url: string;
  platform: string;
}

interface MediaOutlet {
  name: string;
  type: string;
  description: string;
  url: string;
  focus: string;
}

type SortOption = 'popularity' | 'alphabetical' | 'newest';
type CategoryFilter = 'All' | NewsletterCategory;

// ---------- Data ----------

const NEWSLETTERS: Newsletter[] = [
  {
    name: 'SpaceNews Daily',
    frequency: 'Daily',
    cost: 'Free',
    focusArea: ['Business', 'Policy'],
    subscriberEstimate: '80K+',
    description: 'The most comprehensive daily source for space industry news, covering commercial space, defense, civil space programs, and policy developments worldwide.',
    url: 'https://spacenews.com',
  },
  {
    name: 'Payload Space',
    frequency: '3x/week',
    cost: 'Free',
    focusArea: ['Business', 'Investment'],
    subscriberEstimate: '50K+',
    description: 'Business-focused space newsletter with sharp analysis on deals, launches, and market dynamics. Known for its concise, engaging writing style.',
    url: 'https://payloadspace.com',
  },
  {
    name: 'The Orbital Index',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Technical', 'Business'],
    subscriberEstimate: '25K+',
    description: 'Curated weekly newsletter blending technical deep-dives with business developments. Covers rocket science, satellite tech, and space exploration milestones.',
    url: 'https://orbitalindex.com',
  },
  {
    name: 'Space Intel Report',
    frequency: 'Weekly',
    cost: 'Paid',
    focusArea: ['Defense', 'Policy'],
    subscriberEstimate: '5K+',
    description: 'Premium intelligence briefing focused on space defense, national security, and intelligence community developments. Essential for government and defense professionals.',
    url: 'https://spaceintelreport.com',
  },
  {
    name: 'Via Satellite',
    frequency: 'Daily',
    cost: 'Free',
    focusArea: ['Business', 'Technical'],
    subscriberEstimate: '35K+',
    description: 'The satellite communications industry\'s leading daily newsletter covering satellite operators, ground systems, spectrum policy, and emerging connectivity markets.',
    url: 'https://www.satellitetoday.com',
  },
  {
    name: 'T-Minus Daily',
    frequency: 'Daily',
    cost: 'Free',
    focusArea: ['Business', 'Science'],
    subscriberEstimate: '40K+',
    description: 'Daily podcast and companion newsletter from N2K offering accessible coverage of general space news, launches, exploration updates, and industry milestones.',
    url: 'https://thecyberwire.com/podcasts/t-minus',
  },
  {
    name: 'Astralytical',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Policy', 'Business'],
    subscriberEstimate: '15K+',
    description: 'Independent space policy analysis by Laura Forczyk. Provides thought-provoking commentary on space legislation, agency direction, and industry advocacy.',
    url: 'https://astralytical.com',
  },
  {
    name: 'Space Economy Newsletter',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Investment', 'Business'],
    subscriberEstimate: '12K+',
    description: 'Weekly financial-focused newsletter tracking the $500B+ space economy. Covers SPACs, venture rounds, public company earnings, and market trends.',
    url: 'https://thespaceeconomy.substack.com',
  },
  {
    name: 'Bryce Space Technology',
    frequency: 'Quarterly',
    cost: 'Freemium',
    focusArea: ['Investment', 'Business'],
    subscriberEstimate: '20K+',
    description: 'Authoritative quarterly research reports on space investment, launch market statistics, and small satellite trends. Widely cited by investors and policymakers.',
    url: 'https://brycetech.com',
  },
  {
    name: 'Euroconsult',
    frequency: 'Monthly',
    cost: 'Paid',
    focusArea: ['Business', 'Investment'],
    subscriberEstimate: '8K+',
    description: 'Premium research and advisory firm publishing in-depth satellite, space transportation, and government space program market analysis.',
    url: 'https://www.euroconsult-ec.com',
  },
  {
    name: 'Northern Sky Research (NSR)',
    frequency: 'Monthly',
    cost: 'Paid',
    focusArea: ['Business', 'Technical'],
    subscriberEstimate: '6K+',
    description: 'Leading satellite and space market research firm providing premium analysis on satcom, Earth observation, launch, and emerging space applications.',
    url: 'https://www.nsr.com',
  },
  {
    name: 'Space Capital Quarterly',
    frequency: 'Quarterly',
    cost: 'Free',
    focusArea: ['Investment'],
    subscriberEstimate: '18K+',
    description: 'Quarterly investment trends report from Space Capital VC firm. Tracks space-related venture capital flows, valuations, and emerging technology sectors.',
    url: 'https://www.spacecapital.com',
  },
  {
    name: 'Rocket Report (Ars Technica)',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Technical', 'Business'],
    subscriberEstimate: '60K+',
    description: 'Eric Berger\'s weekly launch roundup from Ars Technica. Comprehensive updates on every launch vehicle, test campaign, and spaceport development globally.',
    url: 'https://arstechnica.com/newsletters',
  },
  {
    name: 'Main Engine Cut Off',
    frequency: 'Weekly',
    cost: 'Freemium',
    focusArea: ['Technical', 'Policy'],
    subscriberEstimate: '10K+',
    description: 'Anthony Colangelo\'s podcast and newsletter providing expert technical and policy analysis on launch vehicles, space stations, and exploration programs.',
    url: 'https://mainenginecutoff.com',
  },
  {
    name: 'The Downlink (Planetary Society)',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Science'],
    subscriberEstimate: '100K+',
    description: 'The Planetary Society\'s weekly newsletter covering planetary science, robotic exploration, astrobiology, and space advocacy from the world\'s largest space interest group.',
    url: 'https://www.planetary.org/the-downlink',
  },
  {
    name: 'NASA Spaceflight',
    frequency: 'Daily',
    cost: 'Freemium',
    focusArea: ['Technical'],
    subscriberEstimate: '70K+',
    description: 'Deep technical launch coverage and L2 forum access. Known for exclusive insights on SpaceX Starship, SLS, and other major launch programs.',
    url: 'https://www.nasaspaceflight.com',
  },
  {
    name: 'SpaceQ',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Business', 'Policy'],
    subscriberEstimate: '8K+',
    description: 'Canadian space industry news covering the growing Canadian commercial space sector, government programs, and Arctic/northern satellite developments.',
    url: 'https://spaceq.ca',
  },
  {
    name: 'European Spaceflight',
    frequency: '3x/week',
    cost: 'Free',
    focusArea: ['Technical', 'Business'],
    subscriberEstimate: '15K+',
    description: 'Dedicated coverage of the European space industry including ESA, Arianespace, and the growing European commercial space sector.',
    url: 'https://europeanspaceflight.com',
  },
  {
    name: 'Space Explored',
    frequency: 'Daily',
    cost: 'Free',
    focusArea: ['Technical', 'Science'],
    subscriberEstimate: '20K+',
    description: 'Daily space news from the 9to5 media network covering NASA, SpaceX, Blue Origin, and emerging space technologies with accessible writing.',
    url: 'https://spaceexplored.com',
  },
  {
    name: 'Privateer Space Pulse',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Technical', 'Policy'],
    subscriberEstimate: '5K+',
    description: 'Space sustainability and orbital environment newsletter tracking debris, conjunction events, and space traffic management developments.',
    url: 'https://www.privateer.com',
  },
  {
    name: 'Quilty Space',
    frequency: 'Weekly',
    cost: 'Paid',
    focusArea: ['Investment', 'Business'],
    subscriberEstimate: '4K+',
    description: 'Wall Street-focused space equity research and investment analysis. Covers publicly traded space companies with detailed financial modeling.',
    url: 'https://quiltyspace.com',
  },
  {
    name: 'Room: The Space Journal',
    frequency: 'Quarterly',
    cost: 'Paid',
    focusArea: ['Policy', 'Science'],
    subscriberEstimate: '10K+',
    description: 'International space journal covering space law, governance, sustainability, and exploration policy from a global perspective.',
    url: 'https://room.eu.com',
  },
  {
    name: 'NewSpace Global',
    frequency: 'Monthly',
    cost: 'Paid',
    focusArea: ['Business', 'Investment'],
    subscriberEstimate: '3K+',
    description: 'Premium intelligence service tracking 10,000+ space companies worldwide with market analysis, deal tracking, and industry benchmarks.',
    url: 'https://newspaceglobal.com',
  },
  {
    name: 'Seradata SpaceTrak',
    frequency: 'Weekly',
    cost: 'Paid',
    focusArea: ['Technical', 'Business'],
    subscriberEstimate: '3K+',
    description: 'Comprehensive satellite and launch database newsletter with weekly statistical reports on launches, failures, and fleet management.',
    url: 'https://www.seradata.com',
  },
  {
    name: 'Debrief Space',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Science', 'Technical'],
    subscriberEstimate: '30K+',
    description: 'In-depth investigative space journalism covering UFO/UAP developments alongside legitimate space science, technology, and defense reporting.',
    url: 'https://thedebrief.org',
  },
  {
    name: 'Spacewatch.global',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Policy', 'Business'],
    subscriberEstimate: '7K+',
    description: 'International space policy newsletter tracking regulatory developments, spectrum management, and government space programs across all spacefaring nations.',
    url: 'https://spacewatch.global',
  },
  {
    name: 'Space Force News',
    frequency: 'Daily',
    cost: 'Free',
    focusArea: ['Defense'],
    subscriberEstimate: '25K+',
    description: 'Official and unofficial coverage of the U.S. Space Force, Space Command, and military space operations including acquisitions and doctrine.',
    url: 'https://www.spaceforcejournal.com',
  },
  {
    name: 'Satellite Markets & Research',
    frequency: 'Monthly',
    cost: 'Freemium',
    focusArea: ['Business', 'Investment'],
    subscriberEstimate: '9K+',
    description: 'Satellite industry financial analysis covering operator revenues, transponder pricing, capacity trends, and market forecasting.',
    url: 'https://www.satellitemarkets.com',
  },
  {
    name: 'SpaceBridge',
    frequency: 'Bi-weekly',
    cost: 'Free',
    focusArea: ['Business', 'Policy'],
    subscriberEstimate: '6K+',
    description: 'Newsletter connecting the space industry with emerging markets. Covers space applications in agriculture, maritime, energy, and developing economies.',
    url: 'https://spacebridge.substack.com',
  },
  {
    name: 'Earth Observation Insider',
    frequency: 'Weekly',
    cost: 'Freemium',
    focusArea: ['Business', 'Technical'],
    subscriberEstimate: '8K+',
    description: 'Focused newsletter covering the Earth observation and geospatial intelligence market including satellite imagery, analytics, and government contracts.',
    url: 'https://eoinsider.com',
  },
  {
    name: 'Launch Manifest',
    frequency: 'Weekly',
    cost: 'Free',
    focusArea: ['Technical'],
    subscriberEstimate: '15K+',
    description: 'Weekly curated listing of upcoming launches worldwide with detailed manifests, mission profiles, and vehicle configurations.',
    url: 'https://launchmanifest.com',
  },
  {
    name: 'In-Space Matters',
    frequency: 'Monthly',
    cost: 'Free',
    focusArea: ['Technical', 'Business'],
    subscriberEstimate: '4K+',
    description: 'Newsletter dedicated to in-space manufacturing, on-orbit servicing, and space logistics covering the growing orbital economy.',
    url: 'https://inspacematters.substack.com',
  },
  {
    name: 'Constellations (SIA)',
    frequency: 'Monthly',
    cost: 'Free',
    focusArea: ['Policy', 'Business'],
    subscriberEstimate: '12K+',
    description: 'Satellite Industry Association\'s monthly newsletter covering industry advocacy, regulatory filings, and satellite sector economic data.',
    url: 'https://www.sia.org',
  },
];

const PODCASTS: Podcast[] = [
  {
    name: 'Houston We Have a Podcast',
    host: 'NASA / Johnson Space Center',
    frequency: 'Weekly',
    description: 'Official NASA JSC podcast featuring astronauts, engineers, and scientists discussing ISS operations, Artemis, and human spaceflight programs.',
    url: 'https://www.nasa.gov/podcasts/houston-we-have-a-podcast/',
    platform: 'All major platforms',
  },
  {
    name: 'The Space Show',
    host: 'Dr. David Livingston',
    frequency: '3x/week',
    description: 'Long-running interview show with space industry leaders, researchers, and entrepreneurs. Known for in-depth two-hour discussions on space commerce and policy.',
    url: 'https://www.thespaceshow.com',
    platform: 'Website / Podcast apps',
  },
  {
    name: 'Off-Nominal',
    host: 'Jake Kochevar & Anthony Colangelo',
    frequency: 'Weekly',
    description: 'Commercial space podcast covering SpaceX, launch industry news, and space business developments. Smart, conversational format with excellent analysis.',
    url: 'https://offnominal.space',
    platform: 'All major platforms',
  },
  {
    name: 'Main Engine Cut Off',
    host: 'Anthony Colangelo',
    frequency: 'Weekly',
    description: 'Deep-dive podcast on space policy and technology. Renowned for incisive analysis of NASA programs, launch vehicles, and human spaceflight architecture.',
    url: 'https://mainenginecutoff.com',
    platform: 'All major platforms',
  },
  {
    name: 'T-Minus Space Daily',
    host: 'N2K Networks',
    frequency: 'Daily',
    description: 'Short daily podcast covering the top space news of the day. Quick, professional briefing format ideal for busy professionals.',
    url: 'https://thecyberwire.com/podcasts/t-minus',
    platform: 'All major platforms',
  },
  {
    name: 'Spaceflight Now',
    host: 'Various',
    frequency: 'Weekly',
    description: 'Premium launch coverage with detailed pre-launch previews, live commentary, and post-launch analysis from experienced space journalists.',
    url: 'https://spaceflightnow.com',
    platform: 'Website / YouTube',
  },
  {
    name: 'The Space Above Us',
    host: 'Chris Gebhardt',
    frequency: 'Bi-weekly',
    description: 'Historical deep dives into every crewed American spaceflight, from Mercury to the Space Shuttle, told chronologically with meticulous research.',
    url: 'https://thespaceabove.us',
    platform: 'All major platforms',
  },
  {
    name: 'Eyes on Earth',
    host: 'USGS / NASA',
    frequency: 'Monthly',
    description: 'Landsat and Earth observation podcast covering remote sensing, climate monitoring, land use change, and Earth science applications.',
    url: 'https://www.usgs.gov/centers/eros/eyes-earth',
    platform: 'All major platforms',
  },
  {
    name: 'AstroVoice',
    host: 'Various Hosts',
    frequency: 'Weekly',
    description: 'International space podcast featuring interviews with astronauts, cosmonauts, and space industry leaders from around the world.',
    url: 'https://astrovoice.space',
    platform: 'All major platforms',
  },
  {
    name: 'WeMartians',
    host: 'Jake Robins',
    frequency: 'Bi-weekly',
    description: 'Mars-focused podcast covering rover missions, Mars exploration science, future human missions, and the people behind Mars exploration programs.',
    url: 'https://www.wemartians.com',
    platform: 'All major platforms',
  },
];

const MEDIA_OUTLETS: MediaOutlet[] = [
  {
    name: 'SpaceNews',
    type: 'Trade Publication',
    description: 'The space industry\'s newspaper of record. Comprehensive coverage of commercial space, defense, civil programs, and policy with dedicated reporters on every major beat.',
    url: 'https://spacenews.com',
    focus: 'Full industry coverage',
  },
  {
    name: 'Ars Technica (Space)',
    type: 'Technology Media',
    description: 'Eric Berger\'s space reporting at Ars Technica sets the gold standard for technical journalism. Home of the Rocket Report and deep-dive launch coverage.',
    url: 'https://arstechnica.com/space',
    focus: 'Technical / Launch',
  },
  {
    name: 'The Verge (Space)',
    type: 'Technology Media',
    description: 'Accessible space coverage from a major tech outlet. Covers launches, NASA programs, and commercial space with compelling storytelling for a broad audience.',
    url: 'https://www.theverge.com/space',
    focus: 'General / Consumer',
  },
  {
    name: 'Space.com',
    type: 'Space Media',
    description: 'The largest dedicated space news website reaching millions of readers. Covers space science, astronomy, launches, and exploration with accessible writing.',
    url: 'https://www.space.com',
    focus: 'General / Science',
  },
  {
    name: 'NASASpaceflight.com',
    type: 'Enthusiast / Technical',
    description: 'Community-driven technical space journalism with unmatched depth on SpaceX Starship, SLS, and major launch programs. Home to the premier L2 space forum.',
    url: 'https://www.nasaspaceflight.com',
    focus: 'Technical / Launch',
  },
];

// Subscriber estimate to number for sorting
function subscriberToNumber(est: string): number {
  const num = parseInt(est.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num * 1000;
}

// ---------- Components ----------

const CATEGORY_TABS: CategoryFilter[] = ['All', 'Business', 'Technical', 'Policy', 'Investment', 'Defense', 'Science'];

const CATEGORY_COLORS: Record<NewsletterCategory, string> = {
  Business: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  Technical: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Policy: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Investment: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Defense: 'bg-red-500/20 text-red-300 border-red-500/30',
  Science: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const COST_COLORS: Record<CostTier, string> = {
  Free: 'bg-emerald-500/20 text-emerald-300',
  Freemium: 'bg-amber-500/20 text-amber-300',
  Paid: 'bg-rose-500/20 text-rose-300',
};

function NewsletterCard({ newsletter }: { newsletter: Newsletter }) {
  return (
    <a
      href={newsletter.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 flex flex-col h-full group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
            {newsletter.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-400">{newsletter.frequency}</span>
            <span className="text-slate-600">|</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${COST_COLORS[newsletter.cost]}`}>
              {newsletter.cost}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 ml-3 text-right">
          <span className="text-sm font-medium text-cyan-400">{newsletter.subscriberEstimate}</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">subscribers</p>
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed flex-1 mb-3">
        {newsletter.description}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-auto">
        {newsletter.focusArea.map((cat) => (
          <span key={cat} className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[cat]}`}>
            {cat}
          </span>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 truncate">{newsletter.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
        <svg className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

function PodcastCard({ podcast }: { podcast: Podcast }) {
  return (
    <a
      href={podcast.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 flex gap-4 group"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 border border-purple-400/20 flex items-center justify-center">
        <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
          {podcast.name}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">{podcast.host} &middot; {podcast.frequency}</p>
        <p className="text-sm text-slate-300 mt-2 line-clamp-2">{podcast.description}</p>
        <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">{podcast.platform}</p>
      </div>
    </a>
  );
}

function MediaOutletCard({ outlet }: { outlet: MediaOutlet }) {
  return (
    <a
      href={outlet.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
          {outlet.name}
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0 ml-2">
          {outlet.type}
        </span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed mb-3">{outlet.description}</p>
      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
        <span className="text-xs text-slate-500">Focus: {outlet.focus}</span>
        <svg className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

// ---------- Main Page ----------

export default function NewslettersDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');

  const filteredNewsletters = useMemo(() => {
    let results = [...NEWSLETTERS];

    // Category filter
    if (activeCategory !== 'All') {
      results = results.filter((nl) => nl.focusArea.includes(activeCategory as NewsletterCategory));
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (nl) =>
          nl.name.toLowerCase().includes(q) ||
          nl.description.toLowerCase().includes(q) ||
          nl.focusArea.some((f) => f.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'popularity':
        results.sort((a, b) => subscriberToNumber(b.subscriberEstimate) - subscriberToNumber(a.subscriberEstimate));
        break;
      case 'alphabetical':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        // Reverse default order to show newest additions
        results.reverse();
        break;
    }

    return results;
  }, [searchQuery, activeCategory, sortBy]);

  const totalCount = NEWSLETTERS.length;
  const freeCount = NEWSLETTERS.filter((nl) => nl.cost === 'Free').length;
  const paidCount = NEWSLETTERS.filter((nl) => nl.cost === 'Paid').length;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <BreadcrumbSchema items={[
          { name: 'Home', href: '/' },
          { name: 'Resources', href: '/resources' },
          { name: 'Newsletters' },
        ]} />
        <Breadcrumbs items={[
          { label: 'Resources', href: '/resources' },
          { label: 'Newsletters' },
        ]} />

        <AnimatedPageHeader
          title="Space Industry Newsletters & Media"
          subtitle="Curated directory of newsletters, podcasts, and media outlets covering the global space industry. From daily news to premium research reports."
          accentColor="cyan"
        />

        {/* Stats bar */}
        <ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{totalCount}</p>
              <p className="text-xs text-slate-400 mt-1">Newsletters</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{freeCount}</p>
              <p className="text-xs text-slate-400 mt-1">Free Sources</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{PODCASTS.length}</p>
              <p className="text-xs text-slate-400 mt-1">Podcasts</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{MEDIA_OUTLETS.length}</p>
              <p className="text-xs text-slate-400 mt-1">Media Outlets</p>
            </div>
          </div>
        </ScrollReveal>

        {/* Search + Sort controls */}
        <ScrollReveal delay={0.1}>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search newsletters by name or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 cursor-pointer"
              aria-label="Sort newsletters"
            >
              <option value="popularity">Sort by Popularity</option>
              <option value="alphabetical">Sort A-Z</option>
              <option value="newest">Newest Additions</option>
            </select>
          </div>
        </ScrollReveal>

        {/* Category tabs */}
        <ScrollReveal delay={0.15}>
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700" role="tablist" aria-label="Newsletter categories">
            {CATEGORY_TABS.map((cat) => {
              const isActive = activeCategory === cat;
              const count = cat === 'All'
                ? NEWSLETTERS.length
                : NEWSLETTERS.filter((nl) => nl.focusArea.includes(cat as NewsletterCategory)).length;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {cat}
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-cyan-400' : 'text-slate-500'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Newsletter results */}
        <section aria-label="Newsletter directory">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-100">
              Newsletters
              {activeCategory !== 'All' && (
                <span className="text-sm font-normal text-slate-400 ml-2">/ {activeCategory}</span>
              )}
            </h2>
            <span className="text-sm text-slate-400">{filteredNewsletters.length} result{filteredNewsletters.length !== 1 ? 's' : ''}</span>
          </div>

          {filteredNewsletters.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-slate-400 mb-2">No newsletters match your search criteria.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNewsletters.map((nl) => (
                <StaggerItem key={nl.name}>
                  <NewsletterCard newsletter={nl} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </section>

        {/* Podcast Directory */}
        <section aria-label="Podcast directory" className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Space Podcasts</h2>
                <p className="text-sm text-slate-400">{PODCASTS.length} shows covering space science, launches, and industry</p>
              </div>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PODCASTS.map((pod) => (
              <StaggerItem key={pod.name}>
                <PodcastCard podcast={pod} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* Media Outlets */}
        <section aria-label="Media outlets" className="mt-16">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-400/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100">Major Media Outlets</h2>
                <p className="text-sm text-slate-400">Leading space journalism and news organizations</p>
              </div>
            </div>
          </ScrollReveal>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MEDIA_OUTLETS.map((outlet) => (
              <StaggerItem key={outlet.name}>
                <MediaOutletCard outlet={outlet} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* Submission CTA */}
        <ScrollReveal delay={0.2}>
          <div className="mt-16 mb-8 card p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Know a newsletter we missed?</h3>
            <p className="text-sm text-slate-400 mb-4 max-w-lg mx-auto">
              We are always looking to expand this directory. If you publish or know of a space industry newsletter, podcast, or media outlet not listed here, let us know.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              Suggest a Source
            </a>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
