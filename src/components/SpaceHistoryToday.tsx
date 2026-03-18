'use client';

import { useState, useEffect } from 'react';

interface SpaceEvent {
  month: number;
  day: number;
  year: number;
  description: string;
  category: 'launch' | 'exploration' | 'milestone' | 'discovery' | 'crewed' | 'technology';
}

const CATEGORY_STYLES: Record<SpaceEvent['category'], string> = {
  launch: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  exploration: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  milestone: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  discovery: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  crewed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  technology: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const SPACE_EVENTS: SpaceEvent[] = [
  { month: 1, day: 2, year: 2004, description: 'NASA\'s Stardust spacecraft successfully collected samples from Comet Wild 2', category: 'exploration' },
  { month: 1, day: 14, year: 2005, description: 'ESA\'s Huygens probe landed on Saturn\'s moon Titan, the most distant landing ever', category: 'exploration' },
  { month: 1, day: 27, year: 1967, description: 'Apollo 1 fire during a launch rehearsal took the lives of astronauts Grissom, White, and Chaffee', category: 'crewed' },
  { month: 1, day: 28, year: 1986, description: 'Space Shuttle Challenger broke apart 73 seconds after launch', category: 'milestone' },
  { month: 2, day: 1, year: 2003, description: 'Space Shuttle Columbia disintegrated during reentry over Texas', category: 'milestone' },
  { month: 2, day: 7, year: 1984, description: 'Bruce McCandless performed the first untethered spacewalk using the MMU jet pack', category: 'crewed' },
  { month: 2, day: 14, year: 1990, description: 'Voyager 1 took the famous "Pale Blue Dot" photo of Earth from 6 billion km away', category: 'exploration' },
  { month: 2, day: 18, year: 1930, description: 'Clyde Tombaugh discovered Pluto at Lowell Observatory', category: 'discovery' },
  { month: 3, day: 2, year: 1972, description: 'Pioneer 10 launched, becoming the first spacecraft to traverse the asteroid belt', category: 'launch' },
  { month: 3, day: 14, year: 2016, description: 'ESA\'s ExoMars Trace Gas Orbiter launched to search for signs of life on Mars', category: 'launch' },
  { month: 3, day: 17, year: 1958, description: 'Vanguard 1 launched, becoming the oldest human-made satellite still in orbit', category: 'launch' },
  { month: 3, day: 18, year: 1965, description: 'Alexei Leonov performed the first spacewalk during Voskhod 2 mission', category: 'crewed' },
  { month: 3, day: 22, year: 1982, description: 'Space Shuttle Columbia launched on STS-3, the third orbital test flight', category: 'launch' },
  { month: 4, day: 12, year: 1961, description: 'Yuri Gagarin became the first human in space aboard Vostok 1', category: 'crewed' },
  { month: 4, day: 12, year: 1981, description: 'Space Shuttle Columbia launched on STS-1, the first Space Shuttle mission', category: 'launch' },
  { month: 4, day: 24, year: 1990, description: 'Hubble Space Telescope launched aboard Space Shuttle Discovery', category: 'technology' },
  { month: 5, day: 5, year: 1961, description: 'Alan Shepard became the first American in space aboard Freedom 7', category: 'crewed' },
  { month: 5, day: 25, year: 1961, description: 'President Kennedy announced the goal of landing a man on the Moon', category: 'milestone' },
  { month: 5, day: 30, year: 2020, description: 'SpaceX Crew Dragon Demo-2 launched, the first crewed commercial orbital spaceflight', category: 'crewed' },
  { month: 6, day: 16, year: 1963, description: 'Valentina Tereshkova became the first woman in space aboard Vostok 6', category: 'crewed' },
  { month: 6, day: 18, year: 1983, description: 'Sally Ride became the first American woman in space aboard STS-7', category: 'crewed' },
  { month: 7, day: 4, year: 1997, description: 'Mars Pathfinder landed on Mars and deployed the Sojourner rover', category: 'exploration' },
  { month: 7, day: 14, year: 2015, description: 'New Horizons made its closest approach to Pluto after a 9.5-year journey', category: 'exploration' },
  { month: 7, day: 20, year: 1969, description: 'Apollo 11 landed on the Moon; Neil Armstrong took humanity\'s first lunar steps', category: 'crewed' },
  { month: 8, day: 6, year: 2012, description: 'NASA\'s Curiosity rover landed on Mars using the "sky crane" maneuver', category: 'exploration' },
  { month: 8, day: 25, year: 1989, description: 'Voyager 2 made its closest approach to Neptune, the last planetary flyby', category: 'exploration' },
  { month: 9, day: 12, year: 1992, description: 'Mae Jemison became the first African American woman in space on STS-47', category: 'crewed' },
  { month: 9, day: 15, year: 2017, description: 'Cassini spacecraft made its Grand Finale plunge into Saturn\'s atmosphere', category: 'exploration' },
  { month: 10, day: 4, year: 1957, description: 'Sputnik 1 launched, becoming the first artificial satellite to orbit Earth', category: 'milestone' },
  { month: 10, day: 11, year: 2000, description: 'STS-92 began assembly of the ISS Z1 truss and PMA-3', category: 'technology' },
  { month: 10, day: 15, year: 2003, description: 'China launched Shenzhou 5 with Yang Liwei, becoming the third nation to send humans to space', category: 'crewed' },
  { month: 11, day: 2, year: 2000, description: 'The first resident crew arrived at the International Space Station', category: 'milestone' },
  { month: 11, day: 3, year: 1957, description: 'Laika the dog became the first animal to orbit Earth aboard Sputnik 2', category: 'milestone' },
  { month: 11, day: 12, year: 2014, description: 'Rosetta\'s Philae lander touched down on Comet 67P, the first comet landing', category: 'exploration' },
  { month: 11, day: 20, year: 1998, description: 'Zarya module launched, beginning assembly of the International Space Station', category: 'technology' },
  { month: 12, day: 14, year: 1962, description: 'Mariner 2 flew by Venus, the first successful planetary flyby', category: 'exploration' },
  { month: 12, day: 17, year: 2003, description: 'SpaceShipOne made its first powered flight, pioneering private spaceflight', category: 'technology' },
  { month: 12, day: 21, year: 1968, description: 'Apollo 8 launched, the first crewed mission to orbit the Moon', category: 'crewed' },
  { month: 12, day: 25, year: 2021, description: 'James Webb Space Telescope launched aboard an Ariane 5 rocket', category: 'technology' },
];

export default function SpaceHistoryToday() {
  const [event, setEvent] = useState<SpaceEvent | null>(null);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    // Find event matching today's date
    const todayEvent = SPACE_EVENTS.find((e) => e.month === month && e.day === day);

    if (todayEvent) {
      setEvent(todayEvent);
    } else {
      // Fallback: pick a deterministic "random" event based on the day of year
      const dayOfYear = Math.floor(
        (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
      );
      setEvent(SPACE_EVENTS[dayOfYear % SPACE_EVENTS.length]);
    }
  }, []);

  if (!event) return null;

  const yearsAgo = new Date().getFullYear() - event.year;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          This Day in Space
        </h2>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${CATEGORY_STYLES[event.category]}`}>
          {event.category}
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white leading-none">{event.year}</span>
          <span className="text-[10px] text-amber-400/80 mt-0.5">{yearsAgo}y ago</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white/90 leading-relaxed">
            {event.description}
          </p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {new Date(event.year, event.month - 1, event.day).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
