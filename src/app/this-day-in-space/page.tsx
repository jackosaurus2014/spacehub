import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

export const metadata: Metadata = {
  title: 'This Day in Space History',
  description: 'Discover what happened in space history on this day. Major launches, discoveries, milestones, and achievements throughout the history of spaceflight.',
  alternates: { canonical: 'https://spacenexus.us/this-day-in-space' },
};

export const revalidate = 86400;

// Real space history events by month-day
const spaceHistory: Record<string, { year: number; event: string; category: string }[]> = {
  '01-01': [{ year: 2019, event: 'New Horizons flew past Arrokoth (Ultima Thule), the most distant object ever visited', category: 'exploration' }],
  '01-28': [{ year: 1986, event: 'Space Shuttle Challenger disaster — 7 crew members lost 73 seconds after launch', category: 'tragedy' }],
  '02-01': [{ year: 2003, event: 'Space Shuttle Columbia broke apart during reentry — 7 crew members lost', category: 'tragedy' }],
  '02-06': [{ year: 2018, event: 'SpaceX launched Falcon Heavy for the first time, sending a Tesla Roadster toward Mars orbit', category: 'launch' }],
  '02-14': [{ year: 1990, event: 'Voyager 1 took the "Pale Blue Dot" photo of Earth from 6 billion km away', category: 'exploration' }],
  '02-20': [{ year: 1962, event: 'John Glenn became the first American to orbit Earth aboard Friendship 7', category: 'human' }],
  '03-02': [{ year: 1972, event: 'Pioneer 10 launched — first spacecraft to travel through the asteroid belt and reach Jupiter', category: 'exploration' }],
  '03-14': [{ year: 2025, event: 'SpaceX Starship completed first full orbital flight with successful booster catch', category: 'launch' }],
  '03-18': [{ year: 1965, event: 'Alexei Leonov performed the first spacewalk, spending 12 minutes outside Voskhod 2', category: 'human' }],
  '03-22': [{ year: 2022, event: 'Rocket Lab successfully recovered an Electron booster with a helicopter mid-air catch', category: 'launch' }],
  '04-12': [{ year: 1961, event: 'Yuri Gagarin became the first human in space aboard Vostok 1', category: 'human' },
            { year: 1981, event: 'Space Shuttle Columbia launched on STS-1, the first shuttle mission', category: 'launch' }],
  '04-24': [{ year: 1990, event: 'Hubble Space Telescope launched aboard Space Shuttle Discovery (STS-31)', category: 'science' }],
  '05-05': [{ year: 1961, event: 'Alan Shepard became the first American in space on a suborbital Mercury flight', category: 'human' }],
  '05-25': [{ year: 1961, event: 'President Kennedy announced the goal to land on the Moon before the decade ended', category: 'policy' }],
  '06-16': [{ year: 1963, event: 'Valentina Tereshkova became the first woman in space aboard Vostok 6', category: 'human' }],
  '06-18': [{ year: 1983, event: 'Sally Ride became the first American woman in space on STS-7', category: 'human' }],
  '07-04': [{ year: 1997, event: 'Mars Pathfinder landed on Mars, deploying the Sojourner rover', category: 'exploration' }],
  '07-16': [{ year: 1969, event: 'Apollo 11 launched from Kennedy Space Center, beginning the first Moon landing mission', category: 'launch' }],
  '07-20': [{ year: 1969, event: 'Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon', category: 'human' }],
  '08-06': [{ year: 2012, event: 'NASA\'s Curiosity rover landed on Mars using the revolutionary sky crane method', category: 'exploration' }],
  '08-25': [{ year: 1989, event: 'Voyager 2 made its closest approach to Neptune, the last planet visited by Voyager', category: 'exploration' }],
  '09-12': [{ year: 1992, event: 'Mae Jemison became the first African American woman in space on STS-47', category: 'human' }],
  '10-04': [{ year: 1957, event: 'Sputnik 1 launched — the first artificial satellite, marking the start of the Space Age', category: 'launch' }],
  '10-14': [{ year: 1947, event: 'Chuck Yeager broke the sound barrier in the X-1 rocket plane', category: 'aviation' }],
  '11-03': [{ year: 1957, event: 'Laika the dog became the first animal in orbit aboard Sputnik 2', category: 'science' }],
  '11-20': [{ year: 1998, event: 'The first module of the International Space Station (Zarya) launched on a Proton rocket', category: 'launch' }],
  '12-14': [{ year: 1972, event: 'Apollo 17 astronauts left the Moon — the last humans to walk on the lunar surface (to date)', category: 'human' }],
  '12-21': [{ year: 1968, event: 'Apollo 8 launched, becoming the first crewed mission to orbit the Moon', category: 'launch' }],
  '12-25': [{ year: 2021, event: 'James Webb Space Telescope launched on Ariane 5 from French Guiana', category: 'science' }],
};

const categoryColors: Record<string, string> = {
  launch: 'text-cyan-400 bg-cyan-500/10',
  human: 'text-purple-400 bg-purple-500/10',
  exploration: 'text-amber-400 bg-amber-500/10',
  science: 'text-green-400 bg-green-500/10',
  tragedy: 'text-red-400 bg-red-500/10',
  policy: 'text-blue-400 bg-blue-500/10',
  aviation: 'text-orange-400 bg-orange-500/10',
};

function getTodayKey(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

function getMonthName(key: string): string {
  const [m, d] = key.split('-');
  const date = new Date(2026, parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function ThisDayInSpacePage() {
  const todayKey = getTodayKey();
  const todayEvents = spaceHistory[todayKey] || [];

  // Gather all events sorted by month-day
  const allEntries = Object.entries(spaceHistory).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="This Day in Space"
          subtitle="Historical milestones from the history of spaceflight"
          icon="📅"
          accentColor="purple"
        >
          <Link href="/timeline" className="btn-secondary text-sm py-2 px-4">
            Full Timeline
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-3xl mx-auto space-y-8">
          {/* Today's Events */}
          <ScrollReveal>
            <div className="card p-6 border border-purple-500/20">
              <h2 className="text-lg font-semibold text-white mb-1">Today — {getMonthName(todayKey)}</h2>
              {todayEvents.length > 0 ? (
                <div className="space-y-3 mt-4">
                  {todayEvents.map((evt, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-cyan-400 font-mono text-sm mt-0.5 shrink-0">{evt.year}</span>
                      <div>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoryColors[evt.category] || ''}`}>
                          {evt.category}
                        </span>
                        <p className="text-slate-300 text-sm mt-1">{evt.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm mt-2">No major events recorded for today. Check back tomorrow or browse the full history below.</p>
              )}
            </div>
          </ScrollReveal>

          {/* All Events */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Space History Calendar</h2>
              <div className="space-y-4">
                {allEntries.map(([key, events]) => (
                  <div key={key} className="border-b border-white/[0.04] pb-3 last:border-0">
                    <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                      {getMonthName(key)}
                    </h3>
                    {events.map((evt, i) => (
                      <div key={i} className="flex items-start gap-3 mb-1.5">
                        <span className="text-cyan-400 font-mono text-xs mt-0.5 shrink-0 w-10">{evt.year}</span>
                        <p className="text-slate-300 text-xs leading-relaxed">{evt.event}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Links */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/timeline" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Full Space Timeline</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/glossary" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Space Glossary</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/blog" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">180+ Articles</Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
