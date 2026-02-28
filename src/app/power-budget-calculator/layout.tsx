import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Power Budget Calculator | SpaceNexus',
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
  return children;
}
