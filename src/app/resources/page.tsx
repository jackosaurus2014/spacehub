'use client';

import React, { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'Podcasts' | 'Newsletters' | 'YouTube' | 'Conferences' | 'Reports';

interface Resource {
  name: string;
  description: string;
  link: string;
  frequency: string;
  free: boolean;
  category: Category;
  host?: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const RESOURCES: Resource[] = [
  // ── Podcasts ──────────────────────────────────────────────────────────
  {
    name: 'The Space Show',
    host: 'David Livingston',
    description:
      'Long-running interview show featuring engineers, scientists, entrepreneurs, and policy experts across all sectors of the space industry.',
    link: 'https://www.thespaceshow.com/',
    frequency: '2-3 episodes/week',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'Main Engine Cut Off',
    host: 'Anthony Colangelo',
    description:
      'In-depth analysis of spaceflight policy, commercial space, and the forces shaping the industry. Known for nuanced long-form episodes.',
    link: 'https://mainenginecutoff.com/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'Off-Nominal',
    host: 'BPS.space & Jake',
    description:
      'Casual yet informed discussions on rockets, spaceflight news, and the engineering challenges of getting to orbit.',
    link: 'https://offnominalpodcast.com/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'Payload Podcast',
    host: 'Mo Islam',
    description:
      'Interviews with founders, investors, and operators building the commercial space economy. Strong focus on business and venture capital.',
    link: 'https://payloadspace.com/podcast/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'The Orbital Mechanics',
    host: 'Dave & Ben',
    description:
      'Weekly space news roundup and discussion aimed at enthusiasts who want more depth than mainstream coverage provides.',
    link: 'https://theorbitalmechanics.com/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'T-Minus Daily Space',
    host: 'N2K / Maria Varmazis',
    description:
      'Short daily briefings covering the latest space industry developments, launches, and policy changes in under 15 minutes.',
    link: 'https://tminusspace.com/',
    frequency: 'Daily',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'Space Cafe Podcast',
    host: 'SpaceWatch Global',
    description:
      'European-flavored conversations with global space leaders, covering policy, entrepreneurship, and the evolving space ecosystem.',
    link: 'https://spacewatch.global/spacecafe/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'SpaceQ Podcast',
    host: 'Marc Boucher',
    description:
      'Canadian space industry coverage with in-depth interviews spanning satellites, launchers, Earth observation, and government programs.',
    link: 'https://spaceq.ca/',
    frequency: 'Bi-weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'Interplanetary Podcast',
    host: 'Andrew Dunkley',
    description:
      'UK-based show blending space science, engineering, and exploration with expert guests from agencies and startups worldwide.',
    link: 'https://interplanetary.org.uk/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'AstroForge Space Mining',
    host: 'AstroForge',
    description:
      'Behind-the-scenes look at building an asteroid mining company, covering technical milestones, business strategy, and mission updates.',
    link: 'https://www.astroforge.io/',
    frequency: 'Monthly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'TLP - The Launch Pad',
    host: 'Various',
    description:
      'Focused on launch industry trends, vehicle comparisons, rideshare economics, and the evolving smallsat launch market.',
    link: 'https://thelaunchpad.space/',
    frequency: 'Bi-weekly',
    free: true,
    category: 'Podcasts',
  },
  {
    name: 'Houston We Have a Podcast',
    host: 'NASA / JSC',
    description:
      'Official NASA podcast from Johnson Space Center covering ISS operations, Artemis progress, astronaut stories, and science experiments.',
    link: 'https://www.nasa.gov/podcasts/houston-we-have-a-podcast/',
    frequency: 'Weekly',
    free: true,
    category: 'Podcasts',
  },

  // ── Newsletters ───────────────────────────────────────────────────────
  {
    name: 'Payload Space',
    description:
      'The daily essential for space industry professionals. Concise briefings on deals, launches, policy, and market moves delivered every morning.',
    link: 'https://payloadspace.com/',
    frequency: 'Daily',
    free: true,
    category: 'Newsletters',
  },
  {
    name: 'SpaceNews',
    description:
      'The newspaper of record for the space industry, covering military, civil, and commercial space with deep policy and business reporting.',
    link: 'https://spacenews.com/',
    frequency: 'Daily',
    free: false,
    category: 'Newsletters',
  },
  {
    name: 'The Downlink',
    host: 'The Planetary Society',
    description:
      'Weekly newsletter from the Planetary Society covering planetary science, exploration missions, and advocacy updates.',
    link: 'https://www.planetary.org/the-downlink',
    frequency: 'Weekly',
    free: true,
    category: 'Newsletters',
  },
  {
    name: 'Orbital Index',
    description:
      'Curated weekly digest of the most important space news, launches, papers, and links. Compact, high signal-to-noise format.',
    link: 'https://orbitalindex.com/',
    frequency: 'Weekly',
    free: true,
    category: 'Newsletters',
  },
  {
    name: 'Space Explored',
    description:
      'News and analysis on commercial space ventures, NASA programs, and the broader space economy. Part of the 9to5 media network.',
    link: 'https://spaceexplored.com/',
    frequency: 'Daily',
    free: true,
    category: 'Newsletters',
  },
  {
    name: 'Ars Technica Space',
    host: 'Eric Berger',
    description:
      'Eric Berger\'s authoritative space reporting at Ars Technica, known for insider scoops on SpaceX, NASA, and launch industry developments.',
    link: 'https://arstechnica.com/space/',
    frequency: 'Multiple/week',
    free: true,
    category: 'Newsletters',
  },
  {
    name: 'SatNews',
    description:
      'Satellite industry intelligence covering manufacturing, launch services, ground systems, and telecom with a global commercial focus.',
    link: 'https://www.satnews.com/',
    frequency: 'Daily',
    free: false,
    category: 'Newsletters',
  },
  {
    name: 'NextSpace Newsletter',
    description:
      'Weekly roundup of space startup funding, M&A activity, and emerging market trends aimed at investors and entrepreneurs.',
    link: 'https://nextspacenews.com/',
    frequency: 'Weekly',
    free: true,
    category: 'Newsletters',
  },

  // ── YouTube Channels ──────────────────────────────────────────────────
  {
    name: 'Everyday Astronaut',
    host: 'Tim Dodd',
    description:
      'Deep-dive explainers on rocket engines, launch vehicles, and spaceflight concepts with stunning visuals and animations.',
    link: 'https://www.youtube.com/@EverydayAstronaut',
    frequency: '2-4 videos/month',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'Scott Manley',
    description:
      'Astrophysicist-turned-YouTuber delivering clear, technically rigorous breakdowns of launches, orbital mechanics, and space news.',
    link: 'https://www.youtube.com/@scottmanley',
    frequency: '4-8 videos/month',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'Marcus House',
    description:
      'Weekly updates on SpaceX Starship development, launch site construction, and broader spaceflight progress with quality production.',
    link: 'https://www.youtube.com/@MarcusHouse',
    frequency: 'Weekly',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'NASASpaceflight',
    description:
      'Live launch coverage, technical deep-dives, and Boca Chica Starship development tracking from the leading community-driven space outlet.',
    link: 'https://www.youtube.com/@NASASpaceflight',
    frequency: 'Multiple/week',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'SpaceX',
    description:
      'Official SpaceX channel with live launch webcasts, Starship test flights, mission animations, and company milestones.',
    link: 'https://www.youtube.com/@SpaceX',
    frequency: 'Per launch + updates',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'What About It!?',
    host: 'Felix Schlang',
    description:
      'Daily space news coverage focused on SpaceX, Starship, and the broader launch industry with enthusiastic German-accented commentary.',
    link: 'https://www.youtube.com/@WhataboutitFelix',
    frequency: 'Daily',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'Primal Space',
    description:
      'High-quality documentary-style videos exploring the history, engineering, and future of space exploration and the space economy.',
    link: 'https://www.youtube.com/@praborealspace',
    frequency: '1-2 videos/month',
    free: true,
    category: 'YouTube',
  },
  {
    name: 'Dr. Becky',
    host: 'Dr. Becky Smethurst',
    description:
      'Oxford astrophysicist covering black holes, cosmology, and space telescope discoveries with infectious enthusiasm and academic rigor.',
    link: 'https://www.youtube.com/@DrBecky',
    frequency: 'Weekly',
    free: true,
    category: 'YouTube',
  },

  // ── Conferences ───────────────────────────────────────────────────────
  {
    name: 'Space Symposium',
    description:
      'The premier gathering of the global space community. Military, civil, commercial, and international leaders convene annually in Colorado Springs.',
    link: 'https://www.spacesymposium.org/',
    frequency: 'April, Colorado Springs',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'SATELLITE Conference',
    description:
      'The largest annual commercial satellite event, covering connectivity, Earth observation, launch, and the full satcom value chain.',
    link: 'https://www.satshow.com/',
    frequency: 'March, Washington DC',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'International Astronautical Congress (IAC)',
    description:
      'The world\'s foremost space conference, rotating between continents. Technical papers, agency heads, and industry leaders across all domains.',
    link: 'https://www.iafastro.org/events/iac/',
    frequency: 'October, varies globally',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'SmallSat Conference',
    description:
      'Academic and industry conference focused on small satellite technology, missions, and the growing constellation economy.',
    link: 'https://smallsat.org/',
    frequency: 'August, Logan UT',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'SpaceCom',
    description:
      'Commercial space conference connecting entrepreneurs, investors, and government buyers. Strong focus on business development and partnerships.',
    link: 'https://spacecomexpo.com/',
    frequency: 'January, Orlando FL',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'European Space Conference',
    description:
      'High-level policy conference bringing together EU institutions, ESA, and European industry to shape continental space strategy.',
    link: 'https://www.spaceconference.eu/',
    frequency: 'June, Paris/Brussels',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'NewSpace Europe',
    description:
      'Focused on the European commercial space ecosystem, connecting startups, investors, and established players in the NewSpace movement.',
    link: 'https://newspace-europe.lu/',
    frequency: 'November, Luxembourg',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'Space Tech Expo',
    description:
      'Trade show and conference for spacecraft and satellite manufacturing, subsystems, testing, and supply chain networking.',
    link: 'https://www.spacetechexpo.com/',
    frequency: 'Multiple events/year',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'AMOS Conference',
    description:
      'Advanced Maui Optical and Space Surveillance conference. The premier venue for space domain awareness, tracking, and SSA technology.',
    link: 'https://amostech.com/',
    frequency: 'September, Maui HI',
    free: false,
    category: 'Conferences',
  },
  {
    name: 'MilSatCom',
    description:
      'Defense-focused conference on military satellite communications, resilient architectures, and government space acquisition strategies.',
    link: 'https://www.smi-online.co.uk/defence/global/milsatcom',
    frequency: 'November, London',
    free: false,
    category: 'Conferences',
  },

  // ── Reports & Research ────────────────────────────────────────────────
  {
    name: 'BryceTech Start-Up Space Report',
    description:
      'Annual analysis of venture capital investment in space companies, tracking funding rounds, sector breakdowns, and investor trends.',
    link: 'https://brycetech.com/reports',
    frequency: 'Annual',
    free: true,
    category: 'Reports',
  },
  {
    name: 'Space Capital Quarterly',
    description:
      'Quarterly investment report from Space Capital tracking funding across launch, satellites, and geospatial intelligence sectors.',
    link: 'https://www.spacecapital.com/quarterly',
    frequency: 'Quarterly',
    free: true,
    category: 'Reports',
  },
  {
    name: 'Novaspace Reports',
    description:
      'Market intelligence and consulting reports covering satellite manufacturing, launch demand, Earth observation, and the space value chain.',
    link: 'https://www.novaspace.com/',
    frequency: 'Multiple/year',
    free: false,
    category: 'Reports',
  },
  {
    name: 'NSR (Northern Sky Research) Reports',
    description:
      'Detailed market research on satellite communications, EO, navigation, and emerging space applications with revenue forecasts.',
    link: 'https://www.nsr.com/',
    frequency: 'Multiple/year',
    free: false,
    category: 'Reports',
  },
  {
    name: 'FAA Annual Compendium of Commercial Space Transportation',
    description:
      'Comprehensive U.S. government report on launch activity, licensed launches, spaceports, and the commercial spaceflight regulatory landscape.',
    link: 'https://www.faa.gov/space/resources',
    frequency: 'Annual',
    free: true,
    category: 'Reports',
  },
  {
    name: 'SIA State of the Satellite Industry',
    description:
      'Satellite Industry Association annual report covering global revenue figures for satellite services, manufacturing, launch, and ground equipment.',
    link: 'https://sia.org/news-resources/state-of-the-satellite-industry-report/',
    frequency: 'Annual',
    free: true,
    category: 'Reports',
  },
  {
    name: 'ESPI Public Reports',
    description:
      'European Space Policy Institute research papers and briefs analyzing European and global space governance, competitiveness, and programs.',
    link: 'https://www.espi.or.at/reports/',
    frequency: 'Multiple/year',
    free: true,
    category: 'Reports',
  },
];

const CATEGORY_ICONS: Record<Category, string> = {
  Podcasts: '\uD83C\uDFA7',
  Newsletters: '\uD83D\uDCE8',
  YouTube: '\uD83C\uDFAC',
  Conferences: '\uD83C\uDFDF\uFE0F',
  Reports: '\uD83D\uDCCA',
};

const CATEGORIES: Category[] = ['Podcasts', 'Newsletters', 'YouTube', 'Conferences', 'Reports'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<Category>('Podcasts');
  const [search, setSearch] = useState('');

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      Podcasts: 0,
      Newsletters: 0,
      YouTube: 0,
      Conferences: 0,
      Reports: 0,
    };
    RESOURCES.forEach((r) => counts[r.category]++);
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return RESOURCES.filter((r) => {
      if (r.category !== activeTab) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.host && r.host.toLowerCase().includes(q)) ||
        r.frequency.toLowerCase().includes(q)
      );
    });
  }, [activeTab, search]);

  const totalFiltered = useMemo(() => {
    if (!search.trim()) return RESOURCES.length;
    const q = search.toLowerCase().trim();
    return RESOURCES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.host && r.host.toLowerCase().includes(q))
    ).length;
  }, [search]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Resources"
          subtitle="A curated directory of the best podcasts, newsletters, YouTube channels, conferences, and research reports for space professionals and enthusiasts."
          breadcrumb="Resources"
          accentColor="purple"
        />

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-xl">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
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
              type="text"
              placeholder="Search across all resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {search && (
            <p className="text-sm text-slate-400 mt-2">
              {totalFiltered} result{totalFiltered !== 1 ? 's' : ''} across all categories
              {filtered.length !== totalFiltered && (
                <span>
                  {' '}&middot; {filtered.length} in {activeTab}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
          {CATEGORIES.map((cat) => {
            const isActive = activeTab === cat;
            const matchCount = search.trim()
              ? RESOURCES.filter((r) => {
                  if (r.category !== cat) return false;
                  const q = search.toLowerCase().trim();
                  return (
                    r.name.toLowerCase().includes(q) ||
                    r.description.toLowerCase().includes(q) ||
                    (r.host && r.host.toLowerCase().includes(q))
                  );
                }).length
              : categoryCounts[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
                    : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    isActive
                      ? 'bg-purple-500/30 text-purple-200'
                      : 'bg-slate-700/60 text-slate-500'
                  }`}
                >
                  {matchCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Resource Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg">No resources match your search in {activeTab}.</p>
            <button
              onClick={() => setSearch('')}
              className="mt-3 text-purple-400 hover:text-purple-300 underline text-sm transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((resource, idx) => (
              <ScrollReveal key={resource.name} delay={idx * 0.04}>
                <a
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full bg-slate-900/60 border border-slate-800 rounded-xl p-5 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all hover:shadow-lg hover:shadow-purple-500/5"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-100 group-hover:text-purple-300 transition-colors truncate">
                        {resource.name}
                      </h3>
                      {resource.host && (
                        <p className="text-sm text-slate-400 mt-0.5">{resource.host}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                        resource.free
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}
                    >
                      {resource.free ? 'Free' : 'Paid'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-300 leading-relaxed mb-4 line-clamp-3">
                    {resource.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/60">
                    <span className="text-xs text-slate-500">{resource.frequency}</span>
                    <span className="flex items-center gap-1 text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
                      Visit
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </span>
                  </div>
                </a>
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Footer Note */}
        <ScrollReveal delay={0.2}>
          <div className="mt-16 mb-8 text-center">
            <div className="inline-block bg-slate-900/60 border border-slate-800 rounded-xl px-8 py-6">
              <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                Know a great space industry resource we missed?{' '}
                <a
                  href="/contact"
                  className="text-purple-400 hover:text-purple-300 underline transition-colors"
                >
                  Let us know
                </a>{' '}
                and we will add it to the directory.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </main>
  );
}
