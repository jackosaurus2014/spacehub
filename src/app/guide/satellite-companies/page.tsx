import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import FAQSchema from '@/components/seo/FAQSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

export const metadata: Metadata = {
  title: 'Satellite Companies 2026: Earth Observation, Communications & Manufacturing',
  description: 'Complete guide to satellite companies in 2026. Starlink, Planet Labs, OneWeb, Maxar, and 100+ satellite operators, manufacturers, and service providers.',
  keywords: ['satellite companies', 'satellite operators', 'earth observation companies', 'satellite internet companies', 'satellite manufacturing companies', 'Starlink', 'Planet Labs', 'OneWeb'],
  alternates: { canonical: 'https://spacenexus.us/guide/satellite-companies' },
  openGraph: {
    title: 'Satellite Companies 2026 — Complete Industry Guide',
    description: 'Operators, manufacturers, and service providers across the global satellite industry.',
    url: 'https://spacenexus.us/guide/satellite-companies',
  },
};

export const revalidate = 86400;

const faqs = [
  { question: 'How many satellites are in orbit?', answer: 'As of 2026, there are over 13,000 active satellites in orbit, with SpaceX\'s Starlink constellation accounting for more than 6,500. The total number of tracked objects (including debris) exceeds 48,000.' },
  { question: 'What companies make satellites?', answer: 'Major satellite manufacturers include Airbus Defence and Space, Lockheed Martin, Boeing, Maxar Technologies, Thales Alenia Space, Northrop Grumman, and Ball Aerospace. For small satellites, companies like York Space Systems, Rocket Lab (Photon), and Terran Orbital lead the market.' },
  { question: 'What is the satellite industry worth?', answer: 'The global satellite industry generates approximately $280 billion annually, including satellite services ($130B), ground equipment ($150B), satellite manufacturing ($15B), and launch services ($8B). The fastest-growing segment is LEO broadband (Starlink, Kuiper).' },
  { question: 'What do earth observation satellites do?', answer: 'Earth observation (EO) satellites capture images and data about Earth\'s surface, atmosphere, and oceans. Applications include agriculture (crop monitoring), insurance (damage assessment), defense (intelligence), climate monitoring, urban planning, and disaster response.' },
];

export default function SatelliteCompaniesPage() {
  return (
    <div className="min-h-screen bg-space-900">
      <FAQSchema items={faqs} />
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Satellite Companies Guide"
          subtitle="Operators, manufacturers, and service providers in 2026"
          icon="🛰️"
          accentColor="cyan"
        >
          <Link href="/satellites" className="btn-secondary text-sm py-2 px-4">
            Track Satellites
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto space-y-8">
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-300 to-cyan-400 bg-clip-text text-transparent mb-4">Satellite Industry Sectors</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: 'Communications', icon: '📡', companies: 'Starlink (SpaceX), OneWeb (Eutelsat), Amazon Kuiper, SES, Intelsat, Viasat', description: 'Broadband internet, TV broadcast, enterprise connectivity, maritime, aviation' },
                  { title: 'Earth Observation', icon: '🌍', companies: 'Planet Labs, Maxar, BlackSky, Capella Space, ICEYE, Satellogic', description: 'Optical, SAR, and multispectral imaging for agriculture, defense, insurance, climate' },
                  { title: 'Navigation', icon: '📍', companies: 'GPS (US Space Force), Galileo (EU), GLONASS (Russia), BeiDou (China)', description: 'Positioning, navigation, and timing services for billions of devices' },
                  { title: 'Manufacturing', icon: '🏭', companies: 'Airbus, Lockheed Martin, Maxar, Thales, York Space, Terran Orbital', description: 'GEO comm sats, LEO constellation buses, small sats, and cubesats' },
                  { title: 'Launch Services', icon: '🚀', companies: 'SpaceX, Rocket Lab, ULA, Arianespace, ISRO, Blue Origin', description: 'Getting satellites from ground to orbit — the transportation layer' },
                  { title: 'Ground Systems', icon: '📶', companies: 'Hughes, Kymeta, Intellian, ATLAS Space Operations, AWS Ground Station', description: 'Antennas, terminals, ground stations, and ground-as-a-service' },
                ].map(sector => (
                  <div key={sector.title} className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{sector.icon}</span>
                      <h3 className="text-white text-sm font-semibold">{sector.title}</h3>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{sector.description}</p>
                    <p className="text-slate-500 text-[10px]"><strong className="text-slate-400">Key players:</strong> {sector.companies}</p>
                  </div>
                ))}
              </div>
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
              <Link href="/satellites" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">Track 10,000+ Satellites</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/constellations" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Constellation Tracker</Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link href="/company-profiles" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">Company Profiles</Link>
            </div>
          </ScrollReveal>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['guide/satellite-companies']} />
      </div>
    </div>
  );
}
