import type { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';
import FAQSchema from '@/components/seo/FAQSchema';
import { TOOL_FAQS } from '@/lib/tool-faqs';

export const metadata: Metadata = {
  title: 'Orbital Calculator: Delta-V & Escape Velocity',
  description: 'Calculate Hohmann transfer delta-v, orbital period, and escape velocity with real physics formulas. Free interactive tool for satellite mission planning.',
  openGraph: {
    title: 'Orbital Calculator: Delta-V & Escape Velocity',
    description: 'Calculate Hohmann transfer delta-v, orbital period, and escape velocity with real physics formulas. Free interactive tool for satellite mission planning.',
    type: 'website',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Orbital Calculator: Delta-V & Escape Velocity',
    description: 'Calculate Hohmann transfer delta-v, orbital period, and escape velocity with real physics formulas. Free interactive tool for satellite mission planning.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/orbital-calculator',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Orbital Mechanics Calculator',
        description: 'Calculate Hohmann transfer delta-v, orbital periods, escape velocities, and satellite orbital decay.',
        url: 'https://spacenexus.us/orbital-calculator',
      })} />
      {TOOL_FAQS['orbital-calculator'] && <FAQSchema items={TOOL_FAQS['orbital-calculator']} />}
      {children}
    </>
  );
}
