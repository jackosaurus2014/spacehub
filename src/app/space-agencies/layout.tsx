import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Agency Profiles | SpaceNexus',
  description: 'Profiles of 22 space agencies worldwide with budgets, capabilities, and notable missions.',
  openGraph: {
    title: 'Space Agency Profiles | SpaceNexus',
    description: 'Profiles of 22 space agencies worldwide with budgets, capabilities, and notable missions.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
