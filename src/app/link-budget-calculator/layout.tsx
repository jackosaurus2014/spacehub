import { Metadata } from 'next';
import JsonLd, { toolJsonLd } from '@/components/seo/JsonLd';
import FAQSchema from '@/components/seo/FAQSchema';
import { TOOL_FAQS } from '@/lib/tool-faqs';

export const metadata: Metadata = {
  title: 'Link Budget Calculator',
  description: 'Calculate satellite communication link budgets including path loss, antenna gain, and signal-to-noise ratios.',
  openGraph: {
    title: 'Link Budget Calculator | SpaceNexus',
    description: 'Calculate satellite communication link budgets including path loss, antenna gain, and signal-to-noise ratios.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Link Budget Calculator | SpaceNexus',
    description: 'Calculate satellite communication link budgets including path loss, antenna gain, and signal-to-noise ratios.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/link-budget-calculator',
  },
};

export default function LinkBudgetCalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={toolJsonLd({
        name: 'Link Budget Calculator',
        description: 'Calculate satellite communication link budgets including path loss, antenna gain, and signal-to-noise ratios.',
        url: 'https://spacenexus.us/link-budget-calculator',
      })} />
      {TOOL_FAQS['link-budget-calculator'] && <FAQSchema items={TOOL_FAQS['link-budget-calculator']} />}
      {children}
    </>
  );
}
