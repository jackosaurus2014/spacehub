import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Estimated Orbital System Costs - Mission Planning',
  description: 'Comprehensive cost estimates for orbital systems including habitats, fabrication facilities, data centers, propellant depots, solar power arrays, and more. Detailed bill of materials, launch costs, insurance estimates, and operational budgets.',
  keywords: ['orbital system costs', 'space station cost', 'orbital habitat', 'space manufacturing', 'orbital depot', 'space-based solar power', 'space insurance', 'launch costs', 'bill of materials', 'space economics'],
  openGraph: {
    title: 'SpaceNexus - Estimated Orbital System Costs',
    description: 'Plan your orbital venture with detailed cost breakdowns, bill of materials, and insurance estimates for 11 types of orbital systems.',
    url: 'https://spacenexus.us/orbital-costs',
  },
  alternates: {
    canonical: 'https://spacenexus.us/orbital-costs',
  },
};

export default function OrbitalCostsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
