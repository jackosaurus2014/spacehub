import { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';
import FAQSchema from '@/components/seo/FAQSchema';
import { TOOL_FAQS } from '@/lib/tool-faqs';

export const metadata: Metadata = {
  title: 'Power Budget Calculator',
  description: 'Design satellite power systems with solar panel sizing, battery capacity, and power budget analysis tools.',
  openGraph: {
    title: 'Power Budget Calculator | SpaceNexus',
    description: 'Design satellite power systems with solar panel sizing, battery capacity, and power budget analysis tools.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Power Budget Calculator | SpaceNexus',
    description: 'Design satellite power systems with solar panel sizing, battery capacity, and power budget analysis tools.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/power-budget-calculator',
  },
};

export default function PowerBudgetCalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Power Budget Calculator',
        description: 'Design satellite power systems with solar panel sizing, battery capacity, and power budget analysis tools.',
        url: 'https://spacenexus.us/power-budget-calculator',
      })} />
      {TOOL_FAQS['power-budget-calculator'] && <FAQSchema items={TOOL_FAQS['power-budget-calculator']} />}
      {children}
    </>
  );
}
