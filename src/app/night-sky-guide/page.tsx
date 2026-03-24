import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Night Sky Guide',
  description: 'Your guide to observing the night sky. Learn what\'s visible tonight — planets, satellites, meteor showers, and ISS passes. Tips for beginners.',
  alternates: { canonical: 'https://spacenexus.us/night-sky-guide' },
};

export const revalidate = 86400;

const whatToSee = [
  {
    title: 'International Space Station',
    description: 'The ISS is the brightest artificial object in the sky, visible to the naked eye as a fast-moving bright dot. It crosses the sky in 3-5 minutes.',
    tip: 'Look for a bright, steady light moving smoothly across the sky — no blinking. It\'s brighter than most stars.',
    tool: 'Satellite Tracker',
    href: '/satellites',
  },
  {
    title: 'Starlink Satellites',
    description: 'SpaceX\'s Starlink satellites are often visible as a "train" of lights shortly after deployment. Established satellites are dimmer but still visible.',
    tip: 'Starlink trains are best seen within days of a launch. Check our launch schedule for recent Starlink missions.',
    tool: 'Constellation Tracker',
    href: '/constellations',
  },
  {
    title: 'Planets',
    description: 'Venus, Jupiter, Mars, and Saturn are easily visible to the naked eye. They appear as bright, steady points of light that don\'t twinkle like stars.',
    tip: 'Venus is always near the horizon at dawn or dusk. Jupiter is the second-brightest planet. Mars has a distinctive reddish tint.',
    tool: 'Solar Exploration',
    href: '/solar-exploration',
  },
  {
    title: 'Meteor Showers',
    description: 'Major meteor showers occur throughout the year as Earth passes through comet debris trails. Peak nights can produce 60-120 meteors per hour.',
    tip: 'For best viewing: find a dark location, let your eyes adapt for 20 minutes, lie back and look at a wide area of sky.',
    tool: 'Space Calendar',
    href: '/space-calendar',
  },
  {
    title: 'Aurora (Northern Lights)',
    description: 'The aurora borealis is caused by solar particles interacting with Earth\'s magnetic field. Visible from high latitudes when the Kp index is elevated.',
    tip: 'Check the Kp forecast on our Space Weather page. Kp 5+ means aurora may be visible from northern US states.',
    tool: 'Aurora Forecast',
    href: '/aurora-forecast',
  },
];

const meteorShowers2026 = [
  { name: 'Quadrantids', peak: 'Jan 3-4', rate: '120/hr', parent: '2003 EH1 (asteroid)' },
  { name: 'Lyrids', peak: 'Apr 22-23', rate: '20/hr', parent: 'Comet Thatcher' },
  { name: 'Eta Aquariids', peak: 'May 5-6', rate: '50/hr', parent: 'Comet Halley' },
  { name: 'Perseids', peak: 'Aug 12-13', rate: '100/hr', parent: 'Comet Swift-Tuttle' },
  { name: 'Orionids', peak: 'Oct 21-22', rate: '20/hr', parent: 'Comet Halley' },
  { name: 'Leonids', peak: 'Nov 17-18', rate: '15/hr', parent: 'Comet Tempel-Tuttle' },
  { name: 'Geminids', peak: 'Dec 13-14', rate: '150/hr', parent: '3200 Phaethon (asteroid)' },
];

const tips = [
  { title: 'Find Dark Skies', description: 'Light pollution is the biggest enemy of stargazing. Use a light pollution map and drive 30+ minutes from city centers.' },
  { title: 'Let Your Eyes Adapt', description: 'It takes 20-30 minutes for your eyes to fully adapt to darkness. Avoid looking at phone screens (use red filter mode).' },
  { title: 'Use Binoculars First', description: 'Before investing in a telescope, binoculars (7x50 or 10x50) reveal craters on the Moon, Jupiter\'s moons, and star clusters.' },
  { title: 'Check Weather & Moon Phase', description: 'Clear skies are essential. A new moon (or moon below the horizon) provides the darkest skies for deep-sky viewing.' },
  { title: 'Dress Warm', description: 'Even in summer, nights can get cold when you\'re sitting still for hours. Bring layers and a blanket.' },
  { title: 'Use SpaceNexus for Timing', description: 'Our satellite tracker shows ISS pass times, and the space calendar lists meteor shower peaks and planetary events.' },
];

export default function NightSkyGuidePage() {
  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Night Sky Guide"
          subtitle="What to see in the sky tonight"
          icon="🌌"
          accentColor="purple"
        >
          <Link href="/satellite-spotting" className="btn-secondary text-sm py-2 px-4">
            Satellite Spotting
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* What to See */}
          <ScrollReveal>
            <h2 className="text-xl font-semibold text-white mb-4">What to Look For</h2>
            <div className="space-y-4">
              {whatToSee.map((item) => (
                <div key={item.title} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                      <p className="text-slate-400 text-sm mb-2">{item.description}</p>
                      <p className="text-cyan-400/70 text-xs italic">{item.tip}</p>
                    </div>
                    <Link
                      href={item.href}
                      className="shrink-0 text-xs px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
                    >
                      {item.tool}
                    </Link>

        <RelatedModules modules={PAGE_RELATIONS['night-sky-guide']} />
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Meteor Shower Calendar */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">2026 Meteor Shower Calendar</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Shower</th>
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Peak Night</th>
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Rate</th>
                      <th className="text-left text-slate-400 font-medium py-2">Parent Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meteorShowers2026.map((shower) => (
                      <tr key={shower.name} className="border-b border-white/[0.03]">
                        <td className="text-white py-2 pr-4 font-medium">{shower.name}</td>
                        <td className="text-slate-300 py-2 pr-4">{shower.peak}</td>
                        <td className="text-cyan-400 py-2 pr-4">{shower.rate}</td>
                        <td className="text-slate-500 py-2 text-xs">{shower.parent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>

          {/* Beginner Tips */}
          <ScrollReveal>
            <h2 className="text-lg font-semibold text-white mb-4">Stargazing Tips</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {tips.map((tip, i) => (
                <div key={tip.title} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-mono text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{tip.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Tools CTA */}
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/aurora-forecast" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Aurora Forecast</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/satellites" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Satellite Tracker</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/space-calendar" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Space Calendar</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/this-day-in-space" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">This Day in Space</Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
