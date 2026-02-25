import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Government Space Budgets | SpaceNexus',
  description: 'Track global space agency budgets, programs, and per-capita spending across 15+ agencies.',
  openGraph: {
    title: 'Government Space Budgets | SpaceNexus',
    description: 'Track global space agency budgets, programs, and per-capita spending across 15+ agencies.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
