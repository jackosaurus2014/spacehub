import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Link Budget Calculator | SpaceNexus',
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
  return children;
}
