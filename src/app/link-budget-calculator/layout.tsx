import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Link Budget Calculator | SpaceNexus',
  description: 'Calculate satellite communication link budgets including path loss, antenna gain, and signal-to-noise ratios.',
  openGraph: {
    title: 'Link Budget Calculator | SpaceNexus',
    description: 'Calculate satellite communication link budgets including path loss, antenna gain, and signal-to-noise ratios.',
  },
};

export default function LinkBudgetCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
