import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Power Budget Calculator | SpaceNexus',
  description: 'Design satellite power systems with solar panel sizing, battery capacity, and power budget analysis tools.',
  openGraph: {
    title: 'Power Budget Calculator | SpaceNexus',
    description: 'Design satellite power systems with solar panel sizing, battery capacity, and power budget analysis tools.',
  },
};

export default function PowerBudgetCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
