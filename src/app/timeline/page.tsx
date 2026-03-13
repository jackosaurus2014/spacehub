'use client';

import React, { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ShareButton from '@/components/ui/ShareButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category = 'Milestone' | 'Commercial' | 'Government' | 'Science' | 'Defense' | 'International';
type Era = 'All' | 'Space Race (1957-1975)' | 'Shuttle Era (1976-2010)' | 'Commercial Era (2011-present)';

interface TimelineEvent {
  year: number;
  title: string;
  description: string;
  category: Category;
  icon: string;
}

// ---------------------------------------------------------------------------
// Data  (35+ events, 1957-2025)
// ---------------------------------------------------------------------------

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    year: 1957,
    title: 'Sputnik 1 Launched',
    description:
      'The Soviet Union launched Sputnik 1, the first artificial satellite, into low Earth orbit on October 4, 1957. This 83-kilogram sphere transmitted radio pulses for 21 days and ignited the Space Race between the US and USSR.',
    category: 'Milestone',
    icon: '\uD83D\uDEF0\uFE0F',
  },
  {
    year: 1961,
    title: 'Yuri Gagarin - First Human in Space',
    description:
      'Soviet cosmonaut Yuri Gagarin became the first human to journey into outer space aboard Vostok 1 on April 12, 1961. His single orbit of the Earth lasted 108 minutes, opening the era of human spaceflight.',
    category: 'Milestone',
    icon: '\uD83D\uDE80',
  },
  {
    year: 1962,
    title: 'John Glenn Orbits Earth',
    description:
      'NASA astronaut John Glenn became the first American to orbit the Earth aboard Friendship 7 on February 20, 1962. He completed three orbits during the nearly five-hour mission, restoring American confidence in the Space Race.',
    category: 'Government',
    icon: '\uD83C\uDDFA\uD83C\uDDF8',
  },
  {
    year: 1965,
    title: 'First Spacewalk',
    description:
      'Soviet cosmonaut Alexei Leonov performed the first extravehicular activity (EVA) on March 18, 1965, floating outside the Voskhod 2 capsule for 12 minutes. His spacesuit inflated dangerously in the vacuum, making re-entry into the airlock a life-threatening challenge.',
    category: 'Milestone',
    icon: '\uD83E\uDDD1\u200D\uD83D\uDE80',
  },
  {
    year: 1969,
    title: 'Apollo 11 Moon Landing',
    description:
      'On July 20, 1969, astronauts Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon while Michael Collins orbited above. Armstrong\'s "one small step" fulfilled President Kennedy\'s 1961 challenge and remains one of humanity\'s greatest achievements.',
    category: 'Milestone',
    icon: '\uD83C\uDF11',
  },
  {
    year: 1971,
    title: 'First Space Station (Salyut 1)',
    description:
      'The Soviet Union launched Salyut 1 on April 19, 1971, the world\'s first crewed space station. The Soyuz 11 crew lived aboard for 23 days, but tragically perished during re-entry due to a cabin depressurization.',
    category: 'Government',
    icon: '\uD83C\uDFD7\uFE0F',
  },
  {
    year: 1972,
    title: 'Last Apollo Mission (Apollo 17)',
    description:
      'Apollo 17, launched on December 7, 1972, was the final mission of NASA\'s Apollo program and the last time humans set foot on the Moon. Astronauts Eugene Cernan and Harrison Schmitt spent over three days on the lunar surface.',
    category: 'Government',
    icon: '\uD83C\uDF15',
  },
  {
    year: 1975,
    title: 'Apollo-Soyuz Test Project',
    description:
      'The first international crewed spaceflight saw American and Soviet spacecraft dock in orbit on July 17, 1975. This historic handshake in space symbolized a thaw in Cold War tensions and laid the groundwork for future cooperative missions.',
    category: 'International',
    icon: '\uD83E\uDD1D',
  },
  {
    year: 1981,
    title: 'First Space Shuttle Launch (Columbia)',
    description:
      'Space Shuttle Columbia launched on April 12, 1981, inaugurating the Space Transportation System era. Astronauts John Young and Robert Crippen piloted the first reusable orbital spacecraft, fundamentally changing how humans accessed space.',
    category: 'Government',
    icon: '\uD83D\uDE80',
  },
  {
    year: 1986,
    title: 'Challenger Disaster',
    description:
      'Space Shuttle Challenger broke apart 73 seconds after launch on January 28, 1986, killing all seven crew members including teacher Christa McAuliffe. The tragedy was caused by O-ring failure in the solid rocket boosters and led to sweeping NASA safety reforms.',
    category: 'Government',
    icon: '\uD83D\uDD4A\uFE0F',
  },
  {
    year: 1990,
    title: 'Hubble Space Telescope Launched',
    description:
      'The Hubble Space Telescope was deployed from Space Shuttle Discovery on April 24, 1990. After an initial mirror flaw was corrected in 1993, Hubble revolutionized astronomy with breathtaking deep-field images spanning billions of light-years.',
    category: 'Science',
    icon: '\uD83D\uDD2D',
  },
  {
    year: 1998,
    title: 'ISS Construction Begins',
    description:
      'The International Space Station began construction with the launch of the Russian Zarya module on November 20, 1998. The ISS became the largest international cooperative program in science and engineering history, involving 15 nations.',
    category: 'International',
    icon: '\uD83C\uDFD7\uFE0F',
  },
  {
    year: 2001,
    title: 'Dennis Tito - First Space Tourist',
    description:
      'American businessman Dennis Tito became the world\'s first paying space tourist when he visited the ISS aboard a Russian Soyuz on April 28, 2001. He reportedly paid $20 million for the eight-day trip, pioneering the space tourism industry.',
    category: 'Commercial',
    icon: '\uD83D\uDCB0',
  },
  {
    year: 2003,
    title: 'Columbia Disaster',
    description:
      'Space Shuttle Columbia disintegrated during re-entry on February 1, 2003, killing all seven astronauts aboard. Foam insulation damage during launch had breached the wing\'s thermal protection, leading to structural failure upon atmospheric re-entry.',
    category: 'Government',
    icon: '\uD83D\uDD4A\uFE0F',
  },
  {
    year: 2004,
    title: 'SpaceShipOne Wins X Prize',
    description:
      'SpaceShipOne, funded by Paul Allen and designed by Burt Rutan, won the $10 million Ansari X Prize by completing two suborbital flights within two weeks. This achievement demonstrated that private companies could reach space, catalyzing the commercial space industry.',
    category: 'Commercial',
    icon: '\uD83C\uDFC6',
  },
  {
    year: 2006,
    title: 'SpaceX Falcon 1 First Launch',
    description:
      'SpaceX attempted its first Falcon 1 launch on March 24, 2006, from Kwajalein Atoll in the Pacific. The rocket failed 25 seconds after liftoff due to a fuel line leak, but the attempt marked SpaceX\'s debut as a launch provider.',
    category: 'Commercial',
    icon: '\uD83D\uDE80',
  },
  {
    year: 2008,
    title: 'SpaceX Falcon 1 Reaches Orbit',
    description:
      'On September 28, 2008, SpaceX\'s Falcon 1 became the first privately developed liquid-fueled rocket to reach orbit on its fourth attempt. This milestone proved that a startup could build an orbital-class launch vehicle, reshaping the industry landscape.',
    category: 'Commercial',
    icon: '\u2B50',
  },
  {
    year: 2010,
    title: 'SpaceX Dragon First Orbit & Recovery',
    description:
      'SpaceX\'s Dragon capsule became the first commercially built and operated spacecraft to be recovered from orbit on December 8, 2010. Previously, only governments had achieved orbital recovery, making this a watershed moment for commercial spaceflight.',
    category: 'Commercial',
    icon: '\uD83D\uDC09',
  },
  {
    year: 2011,
    title: 'Final Space Shuttle Mission (STS-135)',
    description:
      'Space Shuttle Atlantis launched on July 8, 2011, for the 135th and final shuttle mission. The 30-year program carried 355 people to space across 135 missions, built the ISS, and deployed Hubble, closing an iconic chapter in spaceflight.',
    category: 'Government',
    icon: '\uD83D\uDEEC',
  },
  {
    year: 2012,
    title: 'SpaceX Dragon Docks with ISS',
    description:
      'On May 25, 2012, SpaceX\'s Dragon became the first commercial spacecraft to deliver cargo to the International Space Station. This mission validated NASA\'s strategy of partnering with private companies for ISS resupply under the Commercial Cargo program.',
    category: 'Commercial',
    icon: '\uD83D\uDEF0\uFE0F',
  },
  {
    year: 2014,
    title: 'Rosetta Comet Landing',
    description:
      'ESA\'s Rosetta mission deployed the Philae lander onto Comet 67P/Churyumov-Gerasimenko on November 12, 2014, achieving the first-ever soft landing on a comet. The mission provided unprecedented data about cometary composition and the origins of our solar system.',
    category: 'Science',
    icon: '\u2604\uFE0F',
  },
  {
    year: 2015,
    title: 'SpaceX First Booster Landing',
    description:
      'SpaceX successfully landed a Falcon 9 first stage booster at Cape Canaveral on December 21, 2015, after delivering 11 ORBCOMM satellites to orbit. This achievement proved rocket reusability was feasible and began transforming launch economics.',
    category: 'Commercial',
    icon: '\uD83C\uDFAF',
  },
  {
    year: 2015,
    title: 'New Horizons Reaches Pluto',
    description:
      'NASA\'s New Horizons spacecraft flew past Pluto on July 14, 2015, after a nine-year journey spanning 3 billion miles. The mission revealed Pluto\'s heart-shaped nitrogen ice plain and complex geology, transforming our understanding of the outer solar system.',
    category: 'Science',
    icon: '\uD83D\uDD2D',
  },
  {
    year: 2016,
    title: 'Blue Origin First Booster Reuse',
    description:
      'Blue Origin reflew its New Shepard booster on January 22, 2016, making it the first rocket to vertically launch, reach space, and land for a second flight. This demonstrated the viability of reusable suborbital vehicles for research and tourism.',
    category: 'Commercial',
    icon: '\uD83D\uDD04',
  },
  {
    year: 2017,
    title: 'SpaceX First Reflight of Orbital Booster',
    description:
      'SpaceX reflew a previously flown Falcon 9 booster for the SES-10 mission on March 30, 2017, marking the first orbital-class rocket reuse. This milestone slashed launch costs and proved that rapid reusability was commercially viable at orbital scale.',
    category: 'Commercial',
    icon: '\u267B\uFE0F',
  },
  {
    year: 2018,
    title: 'SpaceX Falcon Heavy First Launch',
    description:
      'SpaceX\'s Falcon Heavy, then the most powerful operational rocket, launched on February 6, 2018, sending Elon Musk\'s Tesla Roadster toward Mars orbit. Two of three boosters landed simultaneously in a spectacular demonstration of reusable heavy-lift capability.',
    category: 'Commercial',
    icon: '\uD83D\uDCAA',
  },
  {
    year: 2019,
    title: 'Beresheet Lunar Attempt (Israel)',
    description:
      'Israel\'s SpaceIL launched Beresheet on February 22, 2019, the first privately funded lunar lander. Although it crashed during landing on April 11, it demonstrated that nations and private entities beyond traditional space powers could attempt lunar missions.',
    category: 'International',
    icon: '\uD83C\uDDEE\uD83C\uDDF1',
  },
  {
    year: 2019,
    title: 'First Image of a Black Hole',
    description:
      'The Event Horizon Telescope collaboration released the first direct image of a black hole\'s shadow in galaxy M87 on April 10, 2019. The image required a planet-scale array of eight radio telescopes and confirmed predictions of general relativity.',
    category: 'Science',
    icon: '\u26AB',
  },
  {
    year: 2020,
    title: 'SpaceX Crew Dragon First Crewed Flight',
    description:
      'SpaceX\'s Crew Dragon capsule carried NASA astronauts Doug Hurley and Bob Behnken to the ISS on May 30, 2020, restoring American crewed launch capability after nine years. This was the first orbital human spaceflight by a commercial vehicle.',
    category: 'Commercial',
    icon: '\uD83D\uDE80',
  },
  {
    year: 2020,
    title: 'Artemis Accords Signed',
    description:
      'Eight nations signed the Artemis Accords on October 13, 2020, establishing principles for the peaceful exploration of the Moon, Mars, and beyond. The accords built on the Outer Space Treaty to create a framework for responsible resource utilization and transparency.',
    category: 'International',
    icon: '\uD83D\uDCDD',
  },
  {
    year: 2020,
    title: 'US Space Force Established',
    description:
      'The United States Space Force was officially established as the sixth branch of the US military on December 20, 2019, and became fully operational in 2020. It consolidated military space operations under a dedicated service branch to protect US interests in orbit.',
    category: 'Defense',
    icon: '\uD83D\uDEE1\uFE0F',
  },
  {
    year: 2021,
    title: 'Suborbital Tourism Begins',
    description:
      'In July 2021, both Virgin Galactic (July 11) and Blue Origin (July 20) launched their founders on suborbital tourism flights. These missions inaugurated the era of commercial suborbital space tourism with paying passengers following shortly after.',
    category: 'Commercial',
    icon: '\u2708\uFE0F',
  },
  {
    year: 2021,
    title: 'James Webb Space Telescope Launch',
    description:
      'NASA\'s James Webb Space Telescope launched on December 25, 2021, aboard an Ariane 5 rocket to the L2 Lagrange point 1.5 million kilometers from Earth. JWST became the most powerful space telescope ever built, peering deeper into the universe\'s origins than ever before.',
    category: 'Science',
    icon: '\uD83C\uDF1F',
  },
  {
    year: 2022,
    title: 'Artemis I Uncrewed Lunar Mission',
    description:
      'NASA\'s Space Launch System rocket launched the uncrewed Orion spacecraft on a 25-day mission around the Moon on November 16, 2022. Artemis I validated the SLS and Orion systems, paving the way for crewed lunar missions.',
    category: 'Government',
    icon: '\uD83C\uDF19',
  },
  {
    year: 2022,
    title: 'DART Asteroid Deflection Mission',
    description:
      'NASA\'s Double Asteroid Redirection Test (DART) spacecraft intentionally struck asteroid Dimorphos on September 26, 2022. The impact successfully altered the asteroid\'s orbit, proving humanity\'s ability to defend Earth from potentially hazardous space objects.',
    category: 'Defense',
    icon: '\u2604\uFE0F',
  },
  {
    year: 2023,
    title: 'Starship First Integrated Flight Test',
    description:
      'SpaceX launched the fully stacked Starship/Super Heavy vehicle for the first time on April 20, 2023, from Boca Chica, Texas. While the rocket was destroyed minutes after launch, the test provided invaluable data for the world\'s most powerful rocket ever flown.',
    category: 'Commercial',
    icon: '\uD83D\uDE80',
  },
  {
    year: 2023,
    title: 'India Chandrayaan-3 Lunar Landing',
    description:
      'India\'s Chandrayaan-3 successfully soft-landed near the lunar south pole on August 23, 2023, making India the fourth country to land on the Moon. The Pragyan rover explored the surface, conducting in-situ chemical analysis of the lunar regolith.',
    category: 'International',
    icon: '\uD83C\uDDEE\uD83C\uDDF3',
  },
  {
    year: 2024,
    title: 'Starship Achieves Orbit',
    description:
      'SpaceX\'s Starship completed its first successful orbital-class flight, demonstrating the full capability of the largest and most powerful rocket ever built. Subsequent test flights achieved booster catch and re-entry milestones, advancing toward full reusability.',
    category: 'Commercial',
    icon: '\uD83C\uDF1D',
  },
  {
    year: 2024,
    title: 'Boeing Starliner Crewed Test Flight',
    description:
      'Boeing\'s CST-100 Starliner launched its first crewed mission to the ISS on June 5, 2024, carrying astronauts Butch Wilmore and Suni Williams. Thruster issues during the mission led NASA to extend the crew\'s stay and return them on a SpaceX Crew Dragon instead.',
    category: 'Government',
    icon: '\uD83D\uDEF8',
  },
  {
    year: 2025,
    title: 'Artemis II Crewed Lunar Flyby',
    description:
      'Artemis II launched a crew of four astronauts on a trajectory around the Moon, marking humanity\'s first crewed voyage beyond low Earth orbit since Apollo 17 in 1972. This mission validated life support and navigation systems ahead of Artemis III\'s planned lunar landing.',
    category: 'Government',
    icon: '\uD83C\uDF15',
  },
];

// ---------------------------------------------------------------------------
// Category styling
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<Category, { color: string; bgClass: string; borderClass: string; textClass: string; dotClass: string }> = {
  Milestone:     { color: 'cyan',    bgClass: 'bg-white/5',    borderClass: 'border-white/10',    textClass: 'text-slate-300',    dotClass: 'bg-white' },
  Commercial:    { color: 'emerald', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', textClass: 'text-emerald-400', dotClass: 'bg-emerald-400' },
  Government:    { color: 'blue',    bgClass: 'bg-blue-500/10',    borderClass: 'border-blue-500/30',    textClass: 'text-blue-400',    dotClass: 'bg-blue-400' },
  Science:       { color: 'purple',  bgClass: 'bg-purple-500/10',  borderClass: 'border-purple-500/30',  textClass: 'text-purple-400',  dotClass: 'bg-purple-400' },
  Defense:       { color: 'red',     bgClass: 'bg-red-500/10',     borderClass: 'border-red-500/30',     textClass: 'text-red-400',     dotClass: 'bg-red-400' },
  International: { color: 'amber',   bgClass: 'bg-amber-500/10',   borderClass: 'border-amber-500/30',   textClass: 'text-amber-400',   dotClass: 'bg-amber-400' },
};

const ALL_CATEGORIES: Category[] = ['Milestone', 'Commercial', 'Government', 'Science', 'Defense', 'International'];

const ERA_TABS: Era[] = ['All', 'Space Race (1957-1975)', 'Shuttle Era (1976-2010)', 'Commercial Era (2011-present)'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filterByEra(events: TimelineEvent[], era: Era): TimelineEvent[] {
  switch (era) {
    case 'Space Race (1957-1975)':
      return events.filter((e) => e.year >= 1957 && e.year <= 1975);
    case 'Shuttle Era (1976-2010)':
      return events.filter((e) => e.year >= 1976 && e.year <= 2010);
    case 'Commercial Era (2011-present)':
      return events.filter((e) => e.year >= 2011);
    default:
      return events;
  }
}

function getEraBoundaries(events: TimelineEvent[]): { spaceRaceEnd: number; shuttleEnd: number } {
  const years = events.map((e) => e.year);
  return {
    spaceRaceEnd: years.findIndex((y) => y > 1975),
    shuttleEnd: years.findIndex((y) => y > 2010),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EraDivider({ label, gradient }: { label: string; gradient: string }) {
  return (
    <div className="relative flex items-center justify-center my-12">
      <div className={`absolute inset-0 h-px top-1/2 bg-gradient-to-r ${gradient} opacity-40`} />
      <span className="relative z-10 px-6 py-2 rounded-full bg-slate-900 border border-slate-700/50 text-sm font-semibold tracking-wider uppercase text-slate-300">
        {label}
      </span>
    </div>
  );
}

function CategoryChip({
  category,
  active,
  onClick,
}: {
  category: Category;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = CATEGORY_CONFIG[category];
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
        active
          ? `${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`
          : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:border-slate-600 hover:text-slate-300'
      }`}
    >
      {category}
    </button>
  );
}

function TimelineCard({
  event,
  side,
  index,
}: {
  event: TimelineEvent;
  side: 'left' | 'right';
  index: number;
}) {
  const cfg = CATEGORY_CONFIG[event.category];

  return (
    <ScrollReveal
      direction={side === 'left' ? 'left' : 'right'}
      delay={0.05 * (index % 6)}
    >
      <div
        className={`group relative bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm
          hover:border-white/15 hover:bg-slate-800/70 hover:shadow-lg hover:shadow-black/20/5 transition-all duration-300`}
      >
        {/* Year badge */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl" role="img" aria-label={event.title}>
            {event.icon}
          </span>
          <div>
            <span className={`text-xs font-bold tracking-widest uppercase ${cfg.textClass}`}>
              {event.category}
            </span>
            <h3 className="text-lg font-bold text-white leading-snug group-hover:text-white transition-colors duration-200">
              {event.title}
            </h3>
          </div>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">{event.description}</p>

        {/* Year watermark */}
        <span className="absolute top-3 right-4 text-5xl font-black text-slate-700/20 select-none pointer-events-none">
          {event.year}
        </span>
      </div>
    </ScrollReveal>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SpaceTimelinePage() {
  const [selectedEra, setSelectedEra] = useState<Era>('All');
  const [selectedCategories, setSelectedCategories] = useState<Set<Category>>(new Set());

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    let events = filterByEra(TIMELINE_EVENTS, selectedEra);
    if (selectedCategories.size > 0) {
      events = events.filter((e) => selectedCategories.has(e.category));
    }
    return events;
  }, [selectedEra, selectedCategories]);

  // Pre-compute era boundaries for gradient dividers (only in "All" view)
  const eraBounds = useMemo(() => getEraBoundaries(filteredEvents), [filteredEvents]);

  // Stats for the header
  const statYears = TIMELINE_EVENTS[TIMELINE_EVENTS.length - 1].year - TIMELINE_EVENTS[0].year;

  return (
    <div className="min-h-screen">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-4">
        <AnimatedPageHeader
          title="Space Industry Timeline"
          subtitle={`${statYears}+ years of humanity's journey to the stars \u2014 from Sputnik to Artemis and beyond. ${TIMELINE_EVENTS.length} pivotal moments that shaped our future among the stars.`}
          icon={<span className="text-4xl">{'\uD83D\uDE80'}</span>}
          breadcrumb="SpaceNexus"
          accentColor="cyan"
        />
        <ShareButton
          title="Space Industry Timeline - SpaceNexus"
          url="https://spacenexus.us/timeline"
          description="68+ years of humanity's journey to the stars. From Sputnik to Artemis and beyond."
          className="mt-2 flex-shrink-0"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Era filter tabs                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ERA_TABS.map((era) => (
          <button
            key={era}
            onClick={() => setSelectedEra(era)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
              selectedEra === era
                ? 'bg-white/8 border-white/15 text-slate-200 shadow-sm shadow-black/5'
                : 'bg-slate-800/40 border-slate-700/40 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
          >
            {era}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Category chips                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-10 flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            active={selectedCategories.has(cat)}
            onClick={() => toggleCategory(cat)}
          />
        ))}
        {selectedCategories.size > 0 && (
          <button
            onClick={() => setSelectedCategories(new Set())}
            className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Results count                                                     */}
      {/* ----------------------------------------------------------------- */}
      <p className="mb-8 text-sm text-slate-500">
        Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        {selectedEra !== 'All' && <span> in {selectedEra}</span>}
        {selectedCategories.size > 0 && (
          <span> &middot; Filtered by {Array.from(selectedCategories).join(', ')}</span>
        )}
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Timeline                                                          */}
      {/* ----------------------------------------------------------------- */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl mb-4 block">{'\uD83D\uDD2D'}</span>
          <p className="text-slate-400 text-lg">No events match your filters.</p>
          <button
            onClick={() => {
              setSelectedEra('All');
              setSelectedCategories(new Set());
            }}
            className="mt-4 text-slate-300 hover:text-white underline text-sm"
          >
            Reset all filters
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Center vertical line - desktop only */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.3) 5%, rgba(6,182,212,0.3) 95%, transparent)',
            }}
          />

          {/* Left vertical line - mobile only */}
          <div
            className="block md:hidden absolute left-4 top-0 bottom-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(6,182,212,0.3) 5%, rgba(6,182,212,0.3) 95%, transparent)',
            }}
          />

          <div className="space-y-0">
            {filteredEvents.map((event, idx) => {
              const side: 'left' | 'right' = idx % 2 === 0 ? 'left' : 'right';
              const cfg = CATEGORY_CONFIG[event.category];

              // Check if we need an era divider (only in "All" view)
              let dividerBefore: React.ReactNode = null;
              if (selectedEra === 'All' && selectedCategories.size === 0) {
                if (idx === eraBounds.spaceRaceEnd && eraBounds.spaceRaceEnd > 0) {
                  dividerBefore = (
                    <EraDivider
                      label="Shuttle Era (1976 - 2010)"
                      gradient="from-transparent via-blue-500/60 to-transparent"
                    />
                  );
                }
                if (idx === eraBounds.shuttleEnd && eraBounds.shuttleEnd > 0) {
                  dividerBefore = (
                    <EraDivider
                      label="Commercial Era (2011 - Present)"
                      gradient="from-transparent via-emerald-500/60 to-transparent"
                    />
                  );
                }
                if (idx === 0) {
                  dividerBefore = (
                    <EraDivider
                      label="Space Race (1957 - 1975)"
                      gradient="from-transparent via-slate-300/60 to-transparent"
                    />
                  );
                }
              }

              return (
                <React.Fragment key={`${event.year}-${event.title}`}>
                  {dividerBefore}

                  {/* ---- Desktop alternating layout ---- */}
                  <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 md:items-center md:py-4">
                    {/* Left column */}
                    {side === 'left' ? (
                      <div className="flex justify-end">
                        <div className="max-w-md w-full">
                          <TimelineCard event={event} side="left" index={idx} />

        <RelatedModules modules={PAGE_RELATIONS['timeline']} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end items-center">
                        <ScrollReveal direction="left" delay={0.05 * (idx % 6)}>
                          <span className="text-2xl font-black text-slate-600/60">{event.year}</span>
                        </ScrollReveal>
                      </div>
                    )}

                    {/* Center dot */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`w-4 h-4 rounded-full ${cfg.dotClass} ring-4 ring-slate-900 z-10 shadow-lg`}
                        style={{ boxShadow: `0 0 12px ${cfg.color === 'cyan' ? 'rgba(6,182,212,0.4)' : cfg.color === 'emerald' ? 'rgba(16,185,129,0.4)' : cfg.color === 'blue' ? 'rgba(59,130,246,0.4)' : cfg.color === 'purple' ? 'rgba(168,85,247,0.4)' : cfg.color === 'red' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}` }}
                      />
                    </div>

                    {/* Right column */}
                    {side === 'right' ? (
                      <div className="flex justify-start">
                        <div className="max-w-md w-full">
                          <TimelineCard event={event} side="right" index={idx} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-start items-center">
                        <ScrollReveal direction="right" delay={0.05 * (idx % 6)}>
                          <span className="text-2xl font-black text-slate-600/60">{event.year}</span>
                        </ScrollReveal>
                      </div>
                    )}
                  </div>

                  {/* ---- Mobile stacked layout ---- */}
                  <div className="md:hidden flex gap-4 py-3">
                    {/* Dot on left line */}
                    <div className="relative flex flex-col items-center flex-shrink-0" style={{ width: '32px' }}>
                      <div
                        className={`w-3 h-3 rounded-full ${cfg.dotClass} ring-4 ring-slate-900 z-10 mt-6`}
                        style={{ boxShadow: `0 0 10px ${cfg.color === 'cyan' ? 'rgba(6,182,212,0.4)' : cfg.color === 'emerald' ? 'rgba(16,185,129,0.4)' : cfg.color === 'blue' ? 'rgba(59,130,246,0.4)' : cfg.color === 'purple' ? 'rgba(168,85,247,0.4)' : cfg.color === 'red' ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)'}` }}
                      />
                    </div>

                    {/* Card */}
                    <div className="flex-1 min-w-0">
                      <ScrollReveal direction="right" delay={0.05 * (idx % 6)}>
                        <span className="text-xs font-bold text-slate-500 tracking-wider">{event.year}</span>
                      </ScrollReveal>
                      <TimelineCard event={event} side="right" index={idx} />
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Timeline end cap */}
          <div className="flex justify-center mt-8">
            <div className="w-3 h-3 rounded-full bg-white/40 ring-4 ring-slate-900" />
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Footer stats                                                      */}
      {/* ----------------------------------------------------------------- */}
      <div className="mt-16 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Years Covered', value: `${statYears}+`, icon: '\uD83D\uDCC5' },
          { label: 'Key Events', value: String(TIMELINE_EVENTS.length), icon: '\u2B50' },
          { label: 'Categories', value: String(ALL_CATEGORIES.length), icon: '\uD83C\uDFF7\uFE0F' },
          { label: 'Eras', value: '3', icon: '\u23F3' },
        ].map((stat) => (
          <ScrollReveal key={stat.label} delay={0.1}>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-white/10 transition-colors duration-200">
              <span className="text-2xl block mb-1">{stat.icon}</span>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
            </div>
          </ScrollReveal>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Explore More                                                      */}
      {/* ----------------------------------------------------------------- */}
      <ScrollReveal delay={0.15}>
        <section className="mt-16 border-t border-slate-800 pt-8">
          <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/glossary" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Space Industry Glossary</h3>
              <p className="text-slate-400 text-sm mt-1">Comprehensive reference of key terms, acronyms, and concepts.</p>
            </a>
            <a href="/mission-heritage" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Mission Heritage</h3>
              <p className="text-slate-400 text-sm mt-1">Explore the legacy and lineage of historic space missions.</p>
            </a>
            <a href="/space-agencies" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Space Agencies</h3>
              <p className="text-slate-400 text-sm mt-1">Profiles of government space agencies from around the world.</p>
            </a>
            <a href="/mission-stats" className="card p-4 hover:border-white/15 transition-colors group">
              <h3 className="text-white font-medium group-hover:text-white transition-colors">Mission Statistics</h3>
              <p className="text-slate-400 text-sm mt-1">Launch data, success rates, and orbital mission analytics.</p>
            </a>
          </div>
        </section>
      </ScrollReveal>
    </div>
  );
}
