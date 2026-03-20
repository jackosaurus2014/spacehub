import { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';
import FAQSchema from '@/components/seo/FAQSchema';
import { TOOL_FAQS } from '@/lib/tool-faqs';

export const metadata: Metadata = {
  title: 'Space Radiation Environment Calculator',
  description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
  openGraph: {
    title: 'Space Radiation Environment Calculator | SpaceNexus',
    description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Radiation Environment Calculator | SpaceNexus',
    description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/radiation-calculator',
  },
};

export default function RadiationCalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Space Radiation Environment Calculator',
        description: 'Calculate radiation exposure for spacecraft and astronauts across different orbits. Model trapped radiation, GCR, SPE, and shielding effectiveness.',
        url: 'https://spacenexus.us/radiation-calculator',
      })} />
      {TOOL_FAQS['radiation-calculator'] && <FAQSchema items={TOOL_FAQS['radiation-calculator']} />}
      {children}
    </>
  );
}
