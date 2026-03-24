import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Space Companies Directory 2026: Top 50 Aerospace & Space Companies',
  description: 'Complete directory of space companies in 2026. SpaceX, Blue Origin, Rocket Lab, Planet Labs, and 200+ aerospace companies with profiles, funding data, and market intelligence.',
  keywords: ['space companies', 'aerospace companies', 'space companies list', 'top space companies 2026', 'commercial space companies', 'space startup companies', 'satellite companies'],
  alternates: { canonical: 'https://spacenexus.us/guide/space-companies-directory' },
  openGraph: {
    title: 'Top Space Companies 2026 — Complete Directory',
    description: 'Browse 200+ space company profiles with funding data, market intelligence, and SpaceNexus Score ratings.',
    url: 'https://spacenexus.us/guide/space-companies-directory',
  },
};

export const revalidate = 86400;

const faqs = [
  { question: 'What are the biggest space companies in 2026?', answer: 'The largest space companies by valuation are SpaceX (~$200B+), Blue Origin, Northrop Grumman, Lockheed Martin, Boeing, Airbus Defence and Space, L3Harris Technologies, Raytheon (RTX), and Rocket Lab. Among startups, Sierra Space, Vast, and Relativity Space have raised the most capital.' },
  { question: 'How many space companies are there?', answer: 'There are over 10,000 companies worldwide working in the space industry, ranging from multi-billion-dollar primes to early-stage startups. The commercial space sector (NewSpace) includes approximately 2,000+ venture-backed companies.' },
  { question: 'What do space companies do?', answer: 'Space companies operate across the value chain: launch services (SpaceX, Rocket Lab, ULA), satellite manufacturing (Airbus, Maxar), Earth observation (Planet Labs, BlackSky), satellite communications (Starlink, OneWeb), space stations (Axiom, Vast), defense and national security, and more.' },
  { question: 'How do I invest in space companies?', answer: 'Public space companies can be bought as stocks (RKLB, PL, BKSY, SPCE, MNTS, RDW). Space ETFs include ARKX, UFO, and ITA. Private companies like SpaceX require accredited investor access through secondary markets or space-focused VC funds like Space Capital or Seraphim.' },
];

const topCompanies = [
  { name: 'SpaceX', sector: 'Launch, Starlink, Crew', founded: '2002', hq: 'Hawthorne, CA' },
  { name: 'Blue Origin', sector: 'Launch, Space Stations', founded: '2000', hq: 'Kent, WA' },
  { name: 'Rocket Lab', sector: 'Small Launch, Spacecraft', founded: '2006', hq: 'Long Beach, CA' },
  { name: 'Planet Labs', sector: 'Earth Observation', founded: '2010', hq: 'San Francisco, CA' },
  { name: 'Relativity Space', sector: '3D-Printed Rockets', founded: '2015', hq: 'Long Beach, CA' },
  { name: 'Sierra Space', sector: 'Dream Chaser, Stations', founded: '1963', hq: 'Broomfield, CO' },
  { name: 'Vast', sector: 'Space Stations', founded: '2021', hq: 'Long Beach, CA' },
  { name: 'Axiom Space', sector: 'Space Stations', founded: '2016', hq: 'Houston, TX' },
  { name: 'L3Harris', sector: 'Defense, Satellites', founded: '2019', hq: 'Melbourne, FL' },
  { name: 'Maxar Technologies', sector: 'Imaging, Robotics', founded: '2017', hq: 'Westminster, CO' },
  { name: 'BlackSky', sector: 'Real-time EO', founded: '2014', hq: 'Herndon, VA' },
  { name: 'Astra', sector: 'Small Launch', founded: '2016', hq: 'Alameda, CA' },
  { name: 'Capella Space', sector: 'SAR Imaging', founded: '2016', hq: 'San Francisco, CA' },
  { name: 'Astroscale', sector: 'Debris Removal', founded: '2013', hq: 'Tokyo, Japan' },
  { name: 'Firefly Aerospace', sector: 'Small/Medium Launch', founded: '2017', hq: 'Cedar Park, TX' },
];

export default function SpaceCompaniesDirectoryPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <FAQSchema items={faqs} />
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space Companies Directory"
          subtitle="200+ companies profiled with funding, market data, and ratings"
          icon="🏢"
          accentColor="cyan"
        >
          <Link href="/company-profiles" className="btn-primary text-sm py-2 px-4">
            Browse All Companies
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-cyan-400 bg-clip-text text-transparent mb-4">Top Space Companies 2026</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Company</th>
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Sector</th>
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Founded</th>
                      <th className="text-left text-slate-400 font-medium py-2">HQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCompanies.map(c => (
                      <tr key={c.name} className="border-b border-white/[0.03]">
                        <td className="text-white py-2 pr-4 font-medium">{c.name}</td>
                        <td className="text-slate-400 py-2 pr-4">{c.sector}</td>
                        <td className="text-slate-500 py-2 pr-4">{c.founded}</td>
                        <td className="text-slate-500 py-2 text-xs">{c.hq}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-slate-500 text-xs mt-3">
                <Link href="/company-profiles" className="text-cyan-400 hover:text-cyan-300">Browse all 200+ company profiles</Link> with SpaceNexus Score ratings, funding data, and market intelligence.
              </p>
            </div>
          </ScrollReveal>

          {/* FAQ */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqs.map(faq => (
                  <details key={faq.question} className="group">
                    <summary className="flex items-center justify-between cursor-pointer py-2 text-white text-sm font-medium hover:text-cyan-300 transition-colors list-none">
                      {faq.question}
                      <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <p className="text-slate-400 text-sm leading-relaxed pb-2">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
              <Link href="/startup-directory" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Space Startup Directory</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/space-capital" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Space Capital & Funding</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/market-intel" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Market Intelligence</Link>
            </div>
          </ScrollReveal>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/space-companies-directory']} />
      </div>
    </div>
  );
}
